import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

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

        // 3. Allow self-disable IF there's another SUPER_ADMIN
        if (user_id === removed_by_user_id) {
            // Check count of super admins in this organization
            const allAdmins = await adminDb.collection("admin_users")
                .where("organization_id", "==", organization_id)
                .where("role", "==", "SUPER_ADMIN")
                .where("status", "==", "ACTIVE")
                .get();

            if (allAdmins.size <= 1) {
                return NextResponse.json({ 
                    error: "You are the only Super Admin. Assign another Super Admin or invite one before disabling your own account." 
                }, { status: 400 });
            }
        }

        // 4. Prevent removing another SUPER_ADMIN (demote first)
        if (user_id !== removed_by_user_id && targetData.role === "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "Cannot remove another Super Admin. Demote them first." },
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
        await createAuditLog({
            action: "delete",
            entity_type: "system",
            entity_id: user_id,
            admin_id: removed_by_user_id,
            admin_name: removerSnap.data()!.name || removerSnap.data()!.email,
            admin_email: removerSnap.data()!.email,
            organization_id,
            details: `Removed admin ${targetData.email} (${targetData.name})`,
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
