import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/students/add — register a new student/employee
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, grade, section, memberId, parentPhone, route, vehicle_id, organization, organization_id, admin_email, admin_name, address, photo_url, join_date } = body;

        if (!name || !organization_id) {
            return NextResponse.json(
                { error: "name and organization_id are required" },
                { status: 400 }
            );
        }

        let finalMemberId = memberId?.trim();
        if (!finalMemberId) {
            // Auto-generate Member ID
            const orgDoc = await adminDb.collection("organizations").doc(organization_id).get();
            const orgData = orgDoc.data() || {};
            const orgName = orgData.name || organization || "";
            const orgCode = orgData.code || "";
            
            let prefix = "MBR";
            if (orgName) {
                prefix = orgName.split(" ").map((w: string) => w[0]).filter(Boolean).join("").toUpperCase();
            } else if (orgCode) {
                prefix = orgCode.split("-")[0].toUpperCase();
            }
            if (prefix.length > 5) prefix = prefix.substring(0, 4);
            const fullPrefix = `${prefix}-`;

            const snapshot = await adminDb.collection("students").where("organization_id", "==", organization_id).get();
            let maxNum = 0;
            snapshot.forEach(doc => {
                const mId = doc.data().memberId || "";
                if (mId.startsWith(fullPrefix)) {
                    const numPart = mId.replace(fullPrefix, "");
                    const num = parseInt(numPart, 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });
            finalMemberId = `${fullPrefix}${(maxNum + 1).toString().padStart(3, "0")}`;
        }

        const studentDoc = {
            name: name.trim(),
            grade: grade || "", 
            section: section || "",
            memberId: finalMemberId,
            parent_phone: parentPhone || "",
            route: route || "Unassigned",
            route_id: body.route_id || "",
            vehicle_id: vehicle_id || "Unassigned",
            organization: organization || "",
            organization_id,
            status: "active",
            lifecycle_status: "ACTIVE",
            address: address || "",
            photo_url: photo_url || "",
            join_date: join_date || new Date().toISOString().split("T")[0],
            leave_date: null,
            removal_reason: null,
            boarding_point: body.boarding_point || null,
            dropoff_point: body.dropoff_point || null,
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
            details: `Added student ${name.trim()} (${finalMemberId})`,
        });

        return NextResponse.json({
            success: true,
            student_id: docRef.id,
            generated_id: finalMemberId,
            message: `${name} added successfully`,
        });
    } catch (error: any) {
        console.error("Add student error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
