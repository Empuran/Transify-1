import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/drivers/restore — restore an INACTIVE driver back to ACTIVE
export async function POST(req: NextRequest) {
    try {
        const { driver_id, admin_email, admin_name, organization_id } = await req.json();

        if (!driver_id) {
            return NextResponse.json({ error: "driver_id is required" }, { status: 400 });
        }

        const ref = adminDb.collection("drivers").doc(driver_id);
        const snap = await ref.get();
        if (!snap.exists) {
            return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }

        const existing = snap.data();
        const restoreDate = new Date().toISOString().split("T")[0];

        await ref.update({
            lifecycle_status: "ACTIVE",
            leave_date: null,
            removal_reason: null,
            updated_at: new Date().toISOString(),
        });

        await ref.collection("lifecycle_history").add({
            status: "ACTIVE",
            start_date: restoreDate,
            reason: "Restored by admin",
            changed_by: admin_email || "",
            timestamp: new Date().toISOString(),
        });

        if (admin_email && organization_id) {
            await createAuditLog({
                action: "update",
                entity_type: "driver",
                entity_id: driver_id,
                admin_id: admin_email,
                admin_name: admin_name || "",
                admin_email,
                organization_id,
                details: `Restored driver ${existing?.name || driver_id} to active status`,
            });
        }

        return NextResponse.json({ success: true, message: "Driver restored" });
    } catch (error: any) {
        console.error("Restore driver error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



