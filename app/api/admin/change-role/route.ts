import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { user_id, new_role, changed_by_user_id, organization_id } = await req.json();

        if (!user_id || !new_role || !changed_by_user_id || !organization_id) {
            return NextResponse.json(
                { error: "user_id, new_role, changed_by_user_id, and organization_id are required" },
                { status: 400 }
            );
        }

        if (!["ADMIN", "SUPER_ADMIN"].includes(new_role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        // 1. Verify the changer is SUPER_ADMIN
        const changerSnap = await adminDb.collection("admin_users").doc(changed_by_user_id).get();
        if (!changerSnap.exists || changerSnap.data()!.role !== "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "Only Super Admins can change roles" },
                { status: 403 }
            );
        }

        // 2. Get target admin
        const targetSnap = await adminDb.collection("admin_users").doc(user_id).get();
        if (!targetSnap.exists) {
            return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
        }

        const targetData = targetSnap.data()!;
        const oldRole = targetData.role;

        // 3. Allow self-role change IF there's another SUPER_ADMIN
        if (user_id === changed_by_user_id) {
            // Check count of super admins in this organization
            const allAdmins = await adminDb.collection("admin_users")
                .where("organization_id", "==", organization_id)
                .where("role", "==", "SUPER_ADMIN")
                .get();
            
            if (allAdmins.size <= 1) {
                return NextResponse.json({ 
                    error: "You are the only Super Admin. Assign another Super Admin before changing your own role." 
                }, { status: 400 });
            }
        }

        // 4. Update role
        await targetSnap.ref.update({ role: new_role });

        // 5. Log audit
        await adminDb.collection("audit_logs").add({
            action: "ADMIN_ROLE_CHANGED",
            admin_id: changed_by_user_id,
            admin_email: changerSnap.data()!.email,
            admin_name: changerSnap.data()!.name || changerSnap.data()!.email,
            organization_id,
            target_user_id: user_id,
            entity_type: "Admin Role",
            details: `Changed role of ${targetData.email} from ${oldRole} to ${new_role}`,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: `Role changed to ${new_role}`,
        });
    } catch (error: any) {
        console.error("Change role error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
