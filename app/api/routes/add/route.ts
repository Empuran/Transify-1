import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/routes/add — create a new route
export async function POST(req: NextRequest) {
    try {
        const { 
            routeName, startPoint, endPoint, stops, vehicleId, organization_id, 
            admin_email, admin_id, distance_km,
            start_lat, start_lng, end_lat, end_lng 
        } = await req.json();

        if (!routeName || !startPoint || !endPoint || !organization_id) {
            return NextResponse.json({ error: "routeName, startPoint, endPoint, and organization_id are required" }, { status: 400 });
        }

        const routeDoc = {
            route_name: routeName.trim(),
            start_point: startPoint.trim(),
            start_lat: start_lat || null,
            start_lng: start_lng || null,
            end_point: endPoint.trim(),
            end_lat: end_lat || null,
            end_lng: end_lng || null,
            stops: (stops || []).filter((s: any) => s.name?.trim()),
            vehicle_id: vehicleId || "Unassigned",
            organization_id,
            status: "active",
            distance_km: distance_km || "0",
            created_at: new Date().toISOString(),
        };

        const docRef = await adminDb.collection("routes").add(routeDoc);

        // ── Sync Vehicle's route field ────────────────────────────────────────
        if (vehicleId && vehicleId !== "Unassigned") {
            const vehicleQuery = await adminDb.collection("vehicles")
                .where("organization_id", "==", organization_id)
                .where("plate_number", "==", vehicleId)
                .get();
            const vBatch = adminDb.batch();
            vehicleQuery.docs.forEach(doc => vBatch.update(doc.ref, { route: routeDoc.route_name }));
            await vBatch.commit();
        }

        // ── Audit Log ────────────────────────────────────────────────────────
        if (admin_id && admin_email) {
            await createAuditLog({
                action: "add",
                entity_type: "route",
                entity_id: docRef.id,
                admin_id,
                admin_email,
                organization_id,
                details: `Added new route: ${routeDoc.route_name}`
            });
        }

        return NextResponse.json({ success: true, route_id: docRef.id, message: `Route ${routeName} created` });
    } catch (error: any) {
        console.error("Add route error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
