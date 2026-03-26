import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog, getChangedFieldLabels } from "@/lib/audit-logger";

// POST /api/drivers/update — update a driver
export async function POST(req: NextRequest) {
    try {
        const {
            driver_id, organization_id, admin_email, admin_id,
            name, phone, licenseNumber, vehicleId, licenseType,
            address, photo_url, join_date
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
        
        // Block assignment if inactive
        if (vehicleId !== undefined && vehicleId !== "" && vehicleId !== "Unassigned") {
            if (oldData?.lifecycle_status === "INACTIVE") {
                return NextResponse.json({ error: "Cannot assign vehicle to an inactive driver. Please restore the driver first." }, { status: 400 });
            }
            updateData.vehicle_id = vehicleId;
        } else if (vehicleId !== undefined) {
            updateData.vehicle_id = vehicleId;
        }

        if (licenseType !== undefined) updateData.license_type = licenseType;
        if (address !== undefined) updateData.address = address;
        if (photo_url !== undefined) updateData.photo_url = photo_url;
        if (join_date !== undefined) updateData.join_date = join_date;

        await driverRef.update(updateData);

        // ── Global Name Sync ─────────────────────────────────────────────────
        // If name changed, update vehicles and routes where this driver is assigned
        if ((name && oldData?.name && name !== oldData.name) || (vehicleId !== undefined && vehicleId !== oldData?.vehicle_id)) {
            const batch = adminDb.batch();

            // 1. If name changed OR vehicle was unlinked, clear old vehicle's driver info
            if (oldData?.vehicle_id && oldData.vehicle_id !== "Unassigned" && oldData.vehicle_id !== vehicleId) {
                const oldVehicleQuery = await adminDb.collection("vehicles")
                    .where("organization_id", "==", organization_id)
                    .where("plate_number", "==", oldData.vehicle_id)
                    .limit(1)
                    .get();
                if (!oldVehicleQuery.empty) {
                    batch.update(oldVehicleQuery.docs[0].ref, { 
                        driver_id: "", 
                        driver_name: "Unassigned" 
                    });
                }
            }

            // 2. If name changed, update all resources by name match (legacy support)
            if (name && oldData?.name && name !== oldData.name) {
                const vehiclesByName = await adminDb.collection("vehicles")
                    .where("organization_id", "==", organization_id)
                    .where("driver_name", "==", oldData.name)
                    .get();
                vehiclesByName.forEach(doc => {
                    batch.update(doc.ref, { driver_name: name });
                });

                const routesByName = await adminDb.collection("routes")
                    .where("organization_id", "==", organization_id)
                    .where("driver_name", "==", oldData.name)
                    .get();
                routesByName.forEach(doc => {
                    batch.update(doc.ref, { driver_name: name });
                });
            }

            // 3. Update current vehicle (match by driver_id or current vehicleId)
            const vehiclesById = await adminDb.collection("vehicles")
                .where("organization_id", "==", organization_id)
                .where("driver_id", "==", driver_id)
                .get();
            vehiclesById.forEach(doc => {
                const vehicleUpdate: any = {};
                if (name !== undefined || oldData?.name) vehicleUpdate.driver_name = name || oldData?.name;
                if (photo_url !== undefined) vehicleUpdate.driver_photo = photo_url;
                batch.update(doc.ref, vehicleUpdate);
            });

            // 4. Link to NOVEL vehicle if changed
            if (vehicleId && vehicleId !== "Unassigned" && vehicleId !== oldData?.vehicle_id) {
                const newVehicleQuery = await adminDb.collection("vehicles")
                    .where("organization_id", "==", organization_id)
                    .where("plate_number", "==", vehicleId)
                    .limit(1)
                    .get();
                if (!newVehicleQuery.empty) {
                    batch.update(newVehicleQuery.docs[0].ref, { 
                        driver_id: driver_id, 
                        driver_name: name || oldData?.name,
                        driver_photo: photo_url || oldData?.photo_url
                    });
                }
            }

            await batch.commit();
        }

        const changedLabels = getChangedFieldLabels(updateData, oldData);

        await createAuditLog({
            action: "update",
            entity_type: "driver",
            entity_id: driver_id,
            admin_id: admin_id || admin_email || "unknown",
            admin_email: admin_email || "",
            organization_id,
            details: `Updated driver ${name || oldData?.name}${changedLabels.length > 0 ? ': ' + changedLabels.join(', ') : ''}`
        });

        return NextResponse.json({ success: true, message: "Driver updated and synced" });
    } catch (error: any) {
        console.error("Update driver error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



