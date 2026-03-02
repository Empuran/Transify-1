import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/students/add — register a new student/employee
export async function POST(req: NextRequest) {
    try {
        const { name, grade, memberId, parentPhone, route, organization, organization_id } = await req.json();

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
            organization: organization || "",
            organization_id,
            status: "at-home", // Default status
            created_at: new Date().toISOString(),
        };

        const docRef = await adminDb.collection("students").add(studentDoc);

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
