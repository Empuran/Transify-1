import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog, getChangedFieldLabels } from "@/lib/audit-logger";

// POST /api/vehicles/update — update a vehicle
export async function POST(req: NextRequest) {
    try {
        const {
            vehicle_id, organization_id, admin_email, admin_id,
            plateNumber, type, capacity, driverName, driverId, driver_phone, driver_photo, fuelType,
            brand_model, year, backup_driver_id, backup_driver_name,
            rc_expiry, insurance_expiry, puc_expiry, fitness_expiry, permit_expiry,
            last_service_date, next_service_due_date, odometer,
            gps_device_id, rfid_device_id, camera_installed, panic_button_available
        } = await req.json();

        if (!vehicle_id || !organization_id) {
            return NextResponse.json({ error: "vehicle_id and organization_id are required" }, { status: 400 });
        }

        const vehicleRef = adminDb.collection("vehicles").doc(vehicle_id);
        const oldData = (await vehicleRef.get()).data();

        const updateData: any = { updated_at: new Date().toISOString() };
        if (plateNumber !== undefined) updateData.plate_number = plateNumber;
        if (type !== undefined) updateData.type = type;
        if (capacity !== undefined) updateData.capacity = capacity;
        if (driverName !== undefined) updateData.driver_name = driverName;
        if (driverId !== undefined) updateData.driver_id = driverId;
        if (driver_phone !== undefined) updateData.driver_phone = driver_phone;
        if (driver_photo !== undefined) updateData.driver_photo = driver_photo;
        if (fuelType !== undefined) updateData.fuel_type = fuelType;

        if (brand_model !== undefined) updateData.brand_model = brand_model;
        if (year !== undefined) updateData.year = year;
        if (backup_driver_id !== undefined) updateData.backup_driver_id = backup_driver_id;
        if (backup_driver_name !== undefined) updateData.backup_driver_name = backup_driver_name;
        if (rc_expiry !== undefined) updateData.rc_expiry = rc_expiry;
        if (insurance_expiry !== undefined) updateData.insurance_expiry = insurance_expiry;
        if (puc_expiry !== undefined) updateData.puc_expiry = puc_expiry;
        if (fitness_expiry !== undefined) updateData.fitness_expiry = fitness_expiry;
        if (permit_expiry !== undefined) updateData.permit_expiry = permit_expiry;
        if (last_service_date !== undefined) updateData.last_service_date = last_service_date;
        if (next_service_due_date !== undefined) updateData.next_service_due_date = next_service_due_date;
        if (odometer !== undefined) updateData.odometer = odometer;
        if (gps_device_id !== undefined) updateData.gps_device_id = gps_device_id;
        if (rfid_device_id !== undefined) updateData.rfid_device_id = rfid_device_id;
        if (camera_installed !== undefined) updateData.camera_installed = !!camera_installed;
        if (panic_button_available !== undefined) updateData.panic_button_available = !!panic_button_available;

        await vehicleRef.update(updateData);

        // ── Global Synchronization ───────────────────────────────────────────
        if (plateNumber && oldData?.plate_number && plateNumber !== oldData.plate_number) {
            // Update all Drivers assigned to this vehicle
            const driversQuery = await adminDb.collection("drivers")
                .where("organization_id", "==", organization_id)
                .where("vehicle_id", "==", oldData.plate_number)
                .get();
            const driverBatch = adminDb.batch();
            driversQuery.docs.forEach(doc => {
                driverBatch.update(doc.ref, { vehicle_id: plateNumber });
            });
            await driverBatch.commit();

            // Update all Routes assigned to this vehicle
            const routesQuery = await adminDb.collection("routes")
                .where("organization_id", "==", organization_id)
                .where("vehicle_id", "==", oldData.plate_number)
                .get();
            const routeBatch = adminDb.batch();
            routesQuery.docs.forEach(doc => {
                routeBatch.update(doc.ref, { vehicle_id: plateNumber });
            });
            await routeBatch.commit();
        }

        const changedLabels = getChangedFieldLabels(updateData, oldData);

        await createAuditLog({
            action: "update",
            entity_type: "vehicle",
            entity_id: vehicle_id,
            admin_id: admin_id || admin_email || "unknown",
            admin_email: admin_email || "",
            organization_id,
            details: `Updated vehicle ${plateNumber || oldData?.plate_number}${changedLabels.length > 0 ? ': ' + changedLabels.join(', ') : ''}`
        });

        return NextResponse.json({ success: true, message: "Vehicle updated" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



