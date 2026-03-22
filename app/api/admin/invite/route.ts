import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";
import { sendAdminInviteEmail } from "@/lib/email";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
    try {
        const { email, role, organization_id, invited_by_user_id, base_url } = await req.json();

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
        await createAuditLog({
            action: "add",
            entity_type: "system",
            entity_id: email.toLowerCase(),
            admin_id: invited_by_user_id,
            admin_name: inviterSnap.data()!.name || inviterSnap.data()!.email,
            admin_email: inviterSnap.data()!.email,
            organization_id,
            details: `Invited ${email} as ${role}`,
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

        // 7. Build accept URL — use base_url from browser (most reliable), fallback to request host
        let appBase: string;
        if (base_url) {
            // Best: the exact origin the admin's browser is on
            appBase = base_url;
        } else {
            // Fallback: detect from request headers (works for true reverse proxies)
            const reqUrl = new URL(req.url);
            const forwardedHost = req.headers.get("x-forwarded-host");
            const forwardedProto = req.headers.get("x-forwarded-proto") || (forwardedHost ? "https" : "http");
            const host = forwardedHost || req.headers.get("host") || reqUrl.host;
            appBase = `${forwardedProto}://${host}`;
        }
        const acceptUrl = `${appBase}/accept-invite?token=${inviteToken}&email=${encodeURIComponent(email.toLowerCase())}`;
        console.log(`📧 Accept URL: ${acceptUrl}`);

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
            return NextResponse.json({
                success: true,
                message: `Invite created for ${email}, but email delivery failed. Share the link manually.`,
                email_error: emailError.message,
                accept_url: acceptUrl,
                invite: { email: email.toLowerCase(), role, status: "INVITED", expires_at: expiresAt },
            });
        }

        return NextResponse.json({
            success: true,
            message: `Invite email sent to ${email}`,
            accept_url: acceptUrl,
            invite: { email: email.toLowerCase(), role, status: "INVITED", expires_at: expiresAt },
        });
    } catch (error: any) {
        console.error("Invite admin error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
