import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// DELETE /api/students/delete — soft-delete a student (sets lifecycle_status=INACTIVE)
export async function DELETE(req: NextRequest) {
    try {
        const { id, admin_email, admin_name, organization_id, removal_reason } = await req.json();

        if (!id || !organization_id) {
            return NextResponse.json({ error: "id and organization_id are required" }, { status: 400 });
        }
        if (!removal_reason?.trim()) {
            return NextResponse.json({ error: "removal_reason is required" }, { status: 400 });
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

        const leaveDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        await ref.update({
            lifecycle_status: "INACTIVE",
            leave_date: leaveDate,
            removal_reason: removal_reason.trim(),
            updated_at: new Date().toISOString(),
        });

        // Write lifecycle history entry
        await ref.collection("lifecycle_history").add({
            status: "INACTIVE",
            start_date: leaveDate,
            reason: removal_reason.trim(),
            changed_by: admin_email || "",
            snapshot_data: existing,
            timestamp: new Date().toISOString(),
        });

        await createAuditLog({
            action: "delete",
            entity_type: "student",
            entity_id: id,
            admin_id: admin_email || "",
            admin_name: admin_name || "",
            admin_email: admin_email || "",
            organization_id,
            details: `Removed student ${existing?.name || id} — Reason: ${removal_reason.trim()}`,
        });

        return NextResponse.json({ success: true, message: "Student removed" });
    } catch (error: any) {
        console.error("Delete student error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}



