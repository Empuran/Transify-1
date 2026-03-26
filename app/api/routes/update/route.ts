import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog, getChangedFieldLabels } from "@/lib/audit-logger";

// POST /api/routes/update — update a route
export async function POST(req: NextRequest) {
    try {
        const {
            route_id, organization_id, admin_email, admin_id,
            routeName, startPoint, endPoint, stops, vehicleId, distance_km,
            start_lat, start_lng, end_lat, end_lng
        } = await req.json();

        if (!route_id || !organization_id) {
            return NextResponse.json({ error: "route_id and organization_id are required" }, { status: 400 });
        }

        const routeRef = adminDb.collection("routes").doc(route_id);
        const oldData = (await routeRef.get()).data();

        const updateData: any = { updated_at: new Date().toISOString() };
        if (routeName !== undefined) updateData.route_name = routeName;
        if (startPoint !== undefined) updateData.start_point = startPoint;
        if (start_lat !== undefined) updateData.start_lat = start_lat;
        if (start_lng !== undefined) updateData.start_lng = start_lng;
        if (endPoint !== undefined) updateData.end_point = endPoint;
        if (end_lat !== undefined) updateData.end_lat = end_lat;
        if (end_lng !== undefined) updateData.end_lng = end_lng;
        if (stops !== undefined) updateData.stops = stops;
        if (vehicleId !== undefined) updateData.vehicle_id = vehicleId;
        if (distance_km !== undefined) updateData.distance_km = distance_km;

        await routeRef.update(updateData);

        // ── Global Synchronization ───────────────────────────────────────────
        const effectiveRouteName = routeName || oldData?.route_name;
        const effectiveVehicleId = vehicleId !== undefined ? vehicleId : oldData?.vehicle_id;
        const oldVehicleId = oldData?.vehicle_id;

        // 1. If vehicle assignment changed, update the vehicle's `route` field
        if (vehicleId !== undefined && vehicleId !== oldVehicleId) {
            const syncBatch = adminDb.batch();
            // Set route on newly assigned vehicle
            if (vehicleId && vehicleId !== "Unassigned") {
                const newVehicleQuery = await adminDb.collection("vehicles")
                    .where("organization_id", "==", organization_id)
                    .where("plate_number", "==", vehicleId)
                    .get();
                newVehicleQuery.docs.forEach(doc => syncBatch.update(doc.ref, { route: effectiveRouteName }));
            }
            // Clear route on previously assigned vehicle
            if (oldVehicleId && oldVehicleId !== "Unassigned") {
                const oldVehicleQuery = await adminDb.collection("vehicles")
                    .where("organization_id", "==", organization_id)
                    .where("plate_number", "==", oldVehicleId)
                    .get();
                oldVehicleQuery.docs.forEach(doc => syncBatch.update(doc.ref, { route: "" }));
            }
            await syncBatch.commit();
        }

        // 2. Also ensure the currently assigned vehicle always has the correct route name
        if (effectiveVehicleId && effectiveVehicleId !== "Unassigned") {
            const vehQuery = await adminDb.collection("vehicles")
                .where("organization_id", "==", organization_id)
                .where("plate_number", "==", effectiveVehicleId)
                .get();
            const vBatch = adminDb.batch();
            vehQuery.docs.forEach(doc => vBatch.update(doc.ref, { route: effectiveRouteName }));
            await vBatch.commit();
        }

        // 3. If route name changed, update all Vehicles and Students referencing the old name
        if (routeName && oldData?.route_name && routeName !== oldData.route_name) {
            const vehiclesQuery = await adminDb.collection("vehicles")
                .where("organization_id", "==", organization_id)
                .where("route", "==", oldData.route_name)
                .get();
            const vehicleBatch = adminDb.batch();
            vehiclesQuery.docs.forEach(doc => vehicleBatch.update(doc.ref, { route: routeName }));
            await vehicleBatch.commit();

            const studentsQuery = await adminDb.collection("students")
                .where("organization_id", "==", organization_id)
                .where("route", "==", oldData.route_name)
                .get();
            const studentBatch = adminDb.batch();
            studentsQuery.docs.forEach(doc => studentBatch.update(doc.ref, { route: routeName }));
            await studentBatch.commit();
        }


        // ── Audit Log ────────────────────────────────────────────────────────
        const changedLabels = getChangedFieldLabels(updateData, oldData);

        await createAuditLog({
            action: "update",
            entity_type: "route",
            entity_id: route_id,
            admin_id: admin_id || admin_email || "unknown",
            admin_email: admin_email || "",
            organization_id,
            details: `Updated route ${routeName || oldData?.route_name}${changedLabels.length > 0 ? ': ' + changedLabels.join(', ') : ''}`
        });

        return NextResponse.json({ success: true, message: "Route updated" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



