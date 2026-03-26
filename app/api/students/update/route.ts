import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog, getChangedFieldLabels } from "@/lib/audit-logger";

// PUT /api/students/update — update a student/employee
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, admin_email, admin_name, organization_id, ...updates } = body;

        if (!id || !organization_id) {
            return NextResponse.json({ error: "id and organization_id are required" }, { status: 400 });
        }

        const ref = adminDb.collection("students").doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // Only allow update if same org
        const existing = snap.data();
        if (existing?.organization_id !== organization_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Map form camelCase fields to Firestore snake_case field names
        const fieldMap: Record<string, string> = {
            parentPhone: "parent_phone",
        };

        const cleanUpdates: Record<string, any> = {};
        for (const [k, v] of Object.entries(updates)) {
            if (v !== undefined) {
                const firestoreKey = fieldMap[k] ?? k;
                cleanUpdates[firestoreKey] = v;
            }
        }
        cleanUpdates.updated_at = new Date().toISOString();

        await ref.update(cleanUpdates);

        // Compute labels of actually changed fields for the audit log
        const changedLabels = getChangedFieldLabels(cleanUpdates, existing);

        await createAuditLog({
            action: "update",
            entity_type: "student",
            entity_id: id,
            admin_id: admin_email || "",
            admin_name: admin_name || "",
            admin_email: admin_email || "",
            organization_id,
            details: `Updated student ${existing?.name || id}${changedLabels.length > 0 ? ': ' + changedLabels.join(', ') : ''}`,
        });

        return NextResponse.json({ success: true, message: "Student updated" });
    } catch (error: any) {
        console.error("Update student error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}



