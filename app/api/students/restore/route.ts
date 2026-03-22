import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/students/restore — restore an INACTIVE student back to ACTIVE
export async function POST(req: NextRequest) {
    try {
        const { id, admin_email, admin_name, organization_id } = await req.json();

        if (!id || !organization_id) {
            return NextResponse.json({ error: "id and organization_id are required" }, { status: 400 });
        }

        const ref = adminDb.collection("students").doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        const existing = snap.data();
        if (existing?.organization_id !== organization_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const restoreDate = new Date().toISOString().split("T")[0];

        await ref.update({
            lifecycle_status: "ACTIVE",
            leave_date: null,
            removal_reason: null,
            updated_at: new Date().toISOString(),
        });

        // Write lifecycle history entry
        await ref.collection("lifecycle_history").add({
            status: "ACTIVE",
            start_date: restoreDate,
            reason: "Restored by admin",
            changed_by: admin_email || "",
            timestamp: new Date().toISOString(),
        });

        await createAuditLog({
            action: "update",
            entity_type: "student",
            entity_id: id,
            admin_id: admin_email || "",
            admin_name: admin_name || "",
            admin_email: admin_email || "",
            organization_id,
            details: `Restored student ${existing?.name || id} to active status`,
        });

        return NextResponse.json({ success: true, message: "Student restored" });
    } catch (error: any) {
        console.error("Restore student error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
