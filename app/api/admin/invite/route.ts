import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendAdminInviteEmail } from "@/lib/email";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
    try {
        const { email, role, organization_id, invited_by_user_id } = await req.json();

        if (!email || !role || !organization_id || !invited_by_user_id) {
            return NextResponse.json(
                { error: "email, role, organization_id, and invited_by_user_id are required" },
                { status: 400 }
            );
        }

        // 1. Verify the inviter is a SUPER_ADMIN
        const inviterSnap = await adminDb.collection("admin_users").doc(invited_by_user_id).get();
        if (!inviterSnap.exists || inviterSnap.data()!.role !== "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "Only Super Admins can invite new admins" },
                { status: 403 }
            );
        }

        // 2. Check if admin already exists for this org
        const existingSnap = await adminDb
            .collection("admin_users")
            .where("email", "==", email.toLowerCase())
            .where("organization_id", "==", organization_id)
            .limit(1)
            .get();

        if (!existingSnap.empty) {
            const existing = existingSnap.docs[0].data();
            if (existing.status === "ACTIVE") {
                return NextResponse.json(
                    { error: "This admin is already active in this organization" },
                    { status: 409 }
                );
            }
            // If INVITED or DISABLED, we'll re-invite
        }

        // 3. Generate invite token
        const inviteToken = randomUUID();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

        // 4. Create or update admin_users record
        const adminData = {
            email: email.toLowerCase(),
            name: email.split("@")[0], // Default name from email, updated on first login
            organization_id,
            role: role as "ADMIN" | "SUPER_ADMIN",
            status: "INVITED",
            invited_by: invited_by_user_id,
            invite_token: inviteToken,
            invite_expires_at: expiresAt,
            created_at: new Date().toISOString(),
        };

        if (!existingSnap.empty) {
            await existingSnap.docs[0].ref.update(adminData);
        } else {
            await adminDb.collection("admin_users").add(adminData);
        }

        // 5. Log audit entry
        await adminDb.collection("audit_logs").add({
            action_type: "ADMIN_INVITE_SENT",
            performed_by_user_id: invited_by_user_id,
            performed_by_email: inviterSnap.data()!.email,
            organization_id,
            target_user_id: email.toLowerCase(),
            details: `Invited ${email} as ${role}`,
            timestamp: new Date().toISOString(),
        });

        // 6. Fetch org name for the email
        let organizationName = "Your Organization";
        try {
            const orgDoc = await adminDb.collection("organizations").doc(organization_id).get();
            if (orgDoc.exists) {
                organizationName = orgDoc.data()!.name || organizationName;
            }
        } catch {
            // fallback to default name
        }

        // 7. Build accept URL and send real email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const acceptUrl = `${appUrl}/accept-invite?token=${inviteToken}&email=${encodeURIComponent(email.toLowerCase())}`;

        try {
            await sendAdminInviteEmail({
                to: email.toLowerCase(),
                organizationName,
                inviterName: inviterSnap.data()!.name || inviterSnap.data()!.email,
                role,
                acceptUrl,
            });
            console.log(`✅ Invite email sent to ${email}`);
        } catch (emailError: any) {
            console.error("⚠️ Email send failed (invite still created):", emailError.message);
            // Don't fail the whole request — the invite record is created
            // The admin can share the link manually if email fails
            return NextResponse.json({
                success: true,
                message: `Invite created for ${email}, but email delivery failed. Share the link manually.`,
                email_error: emailError.message,
                accept_url: acceptUrl,
                invite: {
                    email: email.toLowerCase(),
                    role,
                    status: "INVITED",
                    expires_at: expiresAt,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: `Invite email sent to ${email}`,
            invite: {
                email: email.toLowerCase(),
                role,
                status: "INVITED",
                expires_at: expiresAt,
            },
        });
    } catch (error: any) {
        console.error("Invite admin error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
