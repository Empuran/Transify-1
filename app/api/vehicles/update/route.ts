import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/vehicles/update — update a vehicle
export async function POST(req: NextRequest) {
    try {
        const {
            vehicle_id, organization_id, admin_email, admin_id,
            plateNumber, type, capacity, driverName, fuelType
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
        if (fuelType !== undefined) updateData.fuel_type = fuelType;

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

        await createAuditLog({
            action: "update",
            entity_type: "vehicle",
            entity_id: vehicle_id,
            admin_id: admin_id || admin_email || "unknown",
            admin_email: admin_email || "",
            organization_id,
            details: `Updated vehicle ${plateNumber || oldData?.plate_number}.`
        });

        return NextResponse.json({ success: true, message: "Vehicle updated" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
