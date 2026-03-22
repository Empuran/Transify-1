import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/drivers/delete — soft-delete a driver (sets lifecycle_status=INACTIVE)
export async function POST(req: NextRequest) {
    try {
        const { driver_id, admin_email, admin_name, organization_id, removal_reason } = await req.json();

        if (!driver_id) {
            return NextResponse.json({ error: "driver_id is required" }, { status: 400 });
        }
        if (!removal_reason?.trim()) {
            return NextResponse.json({ error: "removal_reason is required" }, { status: 400 });
        }

        const ref = adminDb.collection("drivers").doc(driver_id);
        const snap = await ref.get();
        if (!snap.exists) {
            return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }

        const existing = snap.data();
        const leaveDate = new Date().toISOString().split("T")[0];

        await ref.update({
            lifecycle_status: "INACTIVE",
            leave_date: leaveDate,
            removal_reason: removal_reason.trim(),
            updated_at: new Date().toISOString(),
            // Clear assignment info from the driver doc as well
            assigned_vehicle_id: "",
            assigned_vehicle_plate: "",
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

        // ── Transition Vehicle Assignments ──────────────────────────────────
        // Use the organization ID from the driver record if missing in body
        const orgId = organization_id || existing?.organization_id;
        
        // Find vehicles where this driver was primary or backup
        // Removing org check here to be more robust - if the driver_id matches, we should clear it
        console.log(`[Driver Delete] Finding vehicles for driver ${driver_id} in org ${orgId}`);
        const primaryVehicles = await adminDb.collection("vehicles")
            .where("driver_id", "==", driver_id)
            .get();

        const backupVehicles = await adminDb.collection("vehicles")
            .where("backup_driver_id", "==", driver_id)
            .get();

        console.log(`[Driver Delete] Found ${primaryVehicles.size} primary and ${backupVehicles.size} backup assignments`);

        const batch = adminDb.batch();

        primaryVehicles.forEach(doc => {
            const data = doc.data();
            console.log(`[Driver Delete] Transitioning primary assignment for vehicle ${doc.id} (${data.plate_number})`);
            if (data.backup_driver_id) {
                // Promote backup to primary
                batch.update(doc.ref, {
                    driver_id: data.backup_driver_id,
                    driver_name: data.backup_driver_name,
                    driver_photo: data.backup_driver_photo || "",
                    driver_phone: data.backup_driver_phone || "",
                    backup_driver_id: "",
                    backup_driver_name: "",
                    updated_at: new Date().toISOString()
                });
            } else {
                // Just clear primary
                batch.update(doc.ref, {
                    driver_id: "",
                    driver_name: "Unassigned",
                    driver_photo: "",
                    driver_phone: "",
                    updated_at: new Date().toISOString()
                });
            }
        });

        backupVehicles.forEach(doc => {
            const data = doc.data();
            console.log(`[Driver Delete] Transitioning backup assignment for vehicle ${doc.id} (${data.plate_number})`);
            batch.update(doc.ref, {
                backup_driver_id: "",
                backup_driver_name: "",
                updated_at: new Date().toISOString()
            });
        });

        await batch.commit();
        console.log(`[Driver Delete] Batch commit successful for driver ${driver_id}`);

        if (admin_email && organization_id) {
            await createAuditLog({
                action: "delete",
                entity_type: "driver",
                entity_id: driver_id,
                admin_id: admin_email,
                admin_name: admin_name || "",
                admin_email,
                organization_id,
                details: `Removed driver ${existing?.name || driver_id} — Reason: ${removal_reason.trim()}`,
            });
        }

        return NextResponse.json({ success: true, message: "Driver removed" });
    } catch (error: any) {
        console.error("Delete driver error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
