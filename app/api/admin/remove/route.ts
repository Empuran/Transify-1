import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { user_id, removed_by_user_id, organization_id } = await req.json();

        if (!user_id || !removed_by_user_id || !organization_id) {
            return NextResponse.json(
                { error: "user_id, removed_by_user_id, and organization_id are required" },
                { status: 400 }
            );
        }

        // 1. Verify the remover is a SUPER_ADMIN
        const removerSnap = await adminDb.collection("admin_users").doc(removed_by_user_id).get();
        if (!removerSnap.exists || removerSnap.data()!.role !== "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "Only Super Admins can remove admins" },
                { status: 403 }
            );
        }

        // 2. Get the target admin
        const targetSnap = await adminDb.collection("admin_users").doc(user_id).get();
        if (!targetSnap.exists) {
            return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
        }

        const targetData = targetSnap.data()!;

        // 3. Prevent removing yourself
        if (user_id === removed_by_user_id) {
            return NextResponse.json(
                { error: "You cannot remove yourself" },
                { status: 400 }
            );
        }

        // 4. Prevent removing another SUPER_ADMIN
        if (targetData.role === "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "Cannot remove a Super Admin. Demote them first." },
                { status: 403 }
            );
        }

        // 5. Set status to DISABLED instead of deleting
        await targetSnap.ref.update({
            status: "DISABLED",
            disabled_at: new Date().toISOString(),
            disabled_by: removed_by_user_id,
        });

        // 6. Log audit entry
        await adminDb.collection("audit_logs").add({
            action_type: "ADMIN_REMOVED",
            performed_by_user_id: removed_by_user_id,
            performed_by_email: removerSnap.data()!.email,
            organization_id,
            target_user_id: user_id,
            details: `Removed admin ${targetData.email} (${targetData.name})`,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: `Admin ${targetData.email} has been removed`,
        });
    } catch (error: any) {
        console.error("Remove admin error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
