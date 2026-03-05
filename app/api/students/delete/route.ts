import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// DELETE /api/students/delete — remove a student/employee
export async function DELETE(req: NextRequest) {
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

        await ref.delete();

        await createAuditLog({
            action: "delete",
            entity_type: "student",
            entity_id: id,
            admin_id: admin_email || "",
            admin_name: admin_name || "",
            admin_email: admin_email || "",
            organization_id,
            details: `Deleted student ${existing?.name || id}`,
        });

        return NextResponse.json({ success: true, message: "Student deleted" });
    } catch (error: any) {
        console.error("Delete student error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
