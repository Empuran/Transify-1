import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/vehicles/add — register a new vehicle
export async function POST(req: NextRequest) {
    try {
        const { plateNumber, type, capacity, driverName, fuelType, organization_id, admin_email, admin_id } = await req.json();

        if (!plateNumber || !type || !organization_id) {
            return NextResponse.json({ error: "plateNumber, type, and organization_id are required" }, { status: 400 });
        }

        const vehicleDoc = {
            plate_number: plateNumber.trim().toUpperCase(),
            type: type,
            capacity: capacity || "0",
            driver_name: driverName || "Unassigned",
            fuel_type: fuelType || "",
            organization_id,
            status: "on-time",
            progress: 0,
            created_at: new Date().toISOString(),
        };

        const docRef = await adminDb.collection("vehicles").add(vehicleDoc);

        await createAuditLog({
            action: "add",
            entity_type: "vehicle",
            entity_id: docRef.id,
            admin_id: admin_id || admin_email || "unknown",
            admin_email: admin_email || "",
            organization_id,
            details: `Added new vehicle: ${vehicleDoc.plate_number} (${vehicleDoc.type})`
        });

        return NextResponse.json({ success: true, vehicle_id: docRef.id, message: `Vehicle ${plateNumber} registered` });
    } catch (error: any) {
        console.error("Add vehicle error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
