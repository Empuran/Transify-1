import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/routes/sync-vehicles
// Backfill: scan all routes and update assigned vehicles' `route` field
export async function POST(req: NextRequest) {
    try {
        const { organization_id } = await req.json();
        if (!organization_id) {
            return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
        }

        const routesSnap = await adminDb.collection("routes")
            .where("organization_id", "==", organization_id)
            .get();

        let updatedCount = 0;
        const batch = adminDb.batch();

        for (const routeDoc of routesSnap.docs) {
            const route = routeDoc.data();
            if (!route.vehicle_id || route.vehicle_id === "Unassigned") continue;

            // Find vehicle by plate_number
            const vehicleQuery = await adminDb.collection("vehicles")
                .where("organization_id", "==", organization_id)
                .where("plate_number", "==", route.vehicle_id)
                .get();

            vehicleQuery.docs.forEach(vDoc => {
                const currentRoute = vDoc.data().route;
                if (currentRoute !== route.route_name) {
                    batch.update(vDoc.ref, { route: route.route_name });
                    updatedCount++;
                }
            });
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: `Synced route names to ${updatedCount} vehicle(s).`,
            updated: updatedCount,
        });
    } catch (error: any) {
        console.error("Route-vehicle sync error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



