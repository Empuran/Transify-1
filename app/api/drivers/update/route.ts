import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/drivers/update — update a driver
export async function POST(req: NextRequest) {
    try {
        const {
            driver_id, organization_id, admin_email, admin_id,
            name, phone, licenseNumber, vehicleId, licenseType
        } = await req.json();

        if (!driver_id || !organization_id) {
            return NextResponse.json({ error: "driver_id and organization_id are required" }, { status: 400 });
        }

        const driverRef = adminDb.collection("drivers").doc(driver_id);
        const driverDoc = await driverRef.get();
        const oldData = driverDoc.data();

        const updateData: any = { updated_at: new Date().toISOString() };
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (licenseNumber !== undefined) updateData.license_number = licenseNumber;
        if (vehicleId !== undefined) updateData.vehicle_id = vehicleId;
        if (licenseType !== undefined) updateData.license_type = licenseType;

        await driverRef.update(updateData);

        // ── Global Name Sync ─────────────────────────────────────────────────
        // If name changed, update vehicles and routes where this driver is assigned
        if (name && oldData?.name && name !== oldData.name) {
            const batch = adminDb.batch();

            // Update Vehicles where driver_name matches old name OR driver_id matches
            const vehiclesByName = await adminDb.collection("vehicles")
                .where("organization_id", "==", organization_id)
                .where("driver_name", "==", oldData.name)
                .get();
            vehiclesByName.forEach(doc => {
                batch.update(doc.ref, { driver_name: name });
            });

            // Also try matching by driver_id field (if vehicles store it)
            const vehiclesById = await adminDb.collection("vehicles")
                .where("organization_id", "==", organization_id)
                .where("driver_id", "==", driver_id)
                .get();
            vehiclesById.forEach(doc => {
                batch.update(doc.ref, { driver_name: name });
            });

            // Update Routes where driver_name matches old name
            const routesByName = await adminDb.collection("routes")
                .where("organization_id", "==", organization_id)
                .where("driver_name", "==", oldData.name)
                .get();
            routesByName.forEach(doc => {
                batch.update(doc.ref, { driver_name: name });
            });

            await batch.commit();
        }

        await createAuditLog({
            action: "update",
            entity_type: "driver",
            entity_id: driver_id,
            admin_id: admin_id || admin_email || "unknown",
            admin_email: admin_email || "",
            organization_id,
            details: `Updated driver ${name || oldData?.name}. Name Sync: ${name ? 'Yes' : 'No'}`
        });

        return NextResponse.json({ success: true, message: "Driver updated and synced" });
    } catch (error: any) {
        console.error("Update driver error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
