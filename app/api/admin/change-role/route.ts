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

        // 3. Prevent changing your own role
        if (user_id === changed_by_user_id) {
            return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
        }

        // 4. Update role
        await targetSnap.ref.update({ role: new_role });

        // 5. Log audit
        await adminDb.collection("audit_logs").add({
            action_type: "ADMIN_ROLE_CHANGED",
            performed_by_user_id: changed_by_user_id,
            performed_by_email: changerSnap.data()!.email,
            organization_id,
            target_user_id: user_id,
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
