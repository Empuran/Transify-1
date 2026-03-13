import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/students/add — register a new student/employee
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, grade, memberId, parentPhone, route, vehicle_id, organization, organization_id, admin_email, admin_name } = body;

        if (!name || !memberId || !organization_id) {
            return NextResponse.json(
                { error: "name, memberId, and organization_id are required" },
                { status: 400 }
            );
        }

        const studentDoc = {
            name: name.trim(),
            grade: grade || "", // Also used for "Dept" in corporate
            memberId: memberId.trim(),
            parent_phone: parentPhone || "",
            route: route || "Unassigned",
            route_id: body.route_id || "",
            vehicle_id: vehicle_id || "Unassigned",
            organization: organization || "",
            organization_id,
            status: "active",
            created_at: new Date().toISOString(),
        };

        const docRef = await adminDb.collection("students").add(studentDoc);

        await createAuditLog({
            action: "add",
            entity_type: "student",
            entity_id: docRef.id,
            admin_id: admin_email || "",
            admin_name: admin_name || "",
            admin_email: admin_email || "",
            organization_id,
            details: `Added student ${name.trim()} (${memberId.trim()})`,
        });

        return NextResponse.json({
            success: true,
            student_id: docRef.id,
            message: `${name} added successfully`,
        });
    } catch (error: any) {
        console.error("Add student error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
