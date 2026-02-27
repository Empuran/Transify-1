import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/admin/accept-invite — validates token and activates the admin
export async function POST(req: NextRequest) {
    try {
        const { token, email } = await req.json();

        if (!token || !email) {
            return NextResponse.json(
                { error: "token and email are required" },
                { status: 400 }
            );
        }

        // Find admin with matching invite token and email
        const snapshot = await adminDb
            .collection("admin_users")
            .where("invite_token", "==", token)
            .where("email", "==", email.toLowerCase())
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json(
                { error: "Invalid or expired invite link" },
                { status: 404 }
            );
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        // Check if already active
        if (data.status === "ACTIVE") {
            return NextResponse.json({
                success: true,
                message: "Your account is already active. You can log in now.",
                already_active: true,
            });
        }

        // Check expiry
        if (data.invite_expires_at && new Date(data.invite_expires_at) < new Date()) {
            return NextResponse.json(
                { error: "This invite link has expired. Please ask the admin to resend the invitation." },
                { status: 410 }
            );
        }

        // Activate the admin
        await doc.ref.update({
            status: "ACTIVE",
            invite_token: null,
            invite_expires_at: null,
            activated_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
        });

        // Log audit entry
        await adminDb.collection("audit_logs").add({
            action_type: "ADMIN_INVITE_ACCEPTED",
            performed_by_user_id: doc.id,
            performed_by_email: email.toLowerCase(),
            organization_id: data.organization_id,
            details: `${email} accepted invite as ${data.role}`,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: "Invitation accepted! You can now log in.",
            organization_id: data.organization_id,
        });
    } catch (error: any) {
        console.error("Accept invite error:", error);
        return NextResponse.json(
            { error: error.message || "Internal error" },
            { status: 500 }
        );
    }
}

// PUT /api/admin/accept-invite — update the admin's display name (one-time after accepting)
export async function PUT(req: NextRequest) {
    try {
        const { email, name } = await req.json();

        if (!email || !name) {
            return NextResponse.json(
                { error: "email and name are required" },
                { status: 400 }
            );
        }

        // Find the admin by email
        const snapshot = await adminDb
            .collection("admin_users")
            .where("email", "==", email.toLowerCase())
            .where("status", "==", "ACTIVE")
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json(
                { error: "Admin not found" },
                { status: 404 }
            );
        }

        // Update the name
        await snapshot.docs[0].ref.update({
            name: name.trim(),
        });

        return NextResponse.json({
            success: true,
            message: "Name updated successfully",
        });
    } catch (error: any) {
        console.error("Update name error:", error);
        return NextResponse.json(
            { error: error.message || "Internal error" },
            { status: 500 }
        );
    }
}
