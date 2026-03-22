import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/drivers/export?organization_id=xxx — export all drivers as CSV
export async function GET(req: NextRequest) {
    const orgId = req.nextUrl.searchParams.get("organization_id");
    if (!orgId) {
        return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
    }

    try {
        const statusParam = req.nextUrl.searchParams.get("status") || "active";
        
        let query = adminDb.collection("drivers").where("organization_id", "==", orgId);
        if (statusParam === "inactive") {
            query = query.where("lifecycle_status", "==", "INACTIVE");
        }

        const snap = await query.get();
        let docs = snap.docs;
        
        if (statusParam === "active") {
            docs = docs.filter(doc => {
                const s = doc.data().lifecycle_status;
                return !s || s === "ACTIVE";
            });
        }


        const rows: string[] = [
            ["Name", "Address", "Photo URL", "Phone", "License Number", "License Type",
             "Vehicle", "Join Date", "Leave Date", "Status", "Removal Reason"].join(",")
        ];

        docs.forEach(doc => {
            const d = doc.data();
            const isInactive = d.lifecycle_status === "INACTIVE";
            const status = isInactive ? "INACTIVE" : "ACTIVE";
            const row = [
                csvEscape(d.name || ""),
                csvEscape(d.address || ""),
                csvEscape(d.photo_url || ""),
                csvEscape(d.phone || ""),
                csvEscape(d.license_number || ""),
                csvEscape(d.license_type || ""),
                csvEscape(d.vehicle_id || ""),
                csvEscape(d.join_date || ""),
                csvEscape(d.leave_date || ""),
                csvEscape(status),
                csvEscape(d.removal_reason || ""),
            ].join(",");
            rows.push(row);
        });

        const csv = rows.join("\n");
        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="drivers-export.csv"`,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
