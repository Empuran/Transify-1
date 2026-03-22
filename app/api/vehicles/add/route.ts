import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/vehicles/add — register a new vehicle
export async function POST(req: NextRequest) {
    try {
        const { 
            plateNumber, type, capacity, driverName, driverId, driver_phone, driver_photo, fuelType, organization_id, admin_email, admin_id,
            brand_model, year, backup_driver_id, backup_driver_name,
            rc_expiry, insurance_expiry, puc_expiry, fitness_expiry, permit_expiry,
            last_service_date, next_service_due_date, odometer,
            gps_device_id, rfid_device_id, camera_installed, panic_button_available
        } = await req.json();

        if (!plateNumber || !type || !organization_id) {
            return NextResponse.json({ error: "plateNumber, type, and organization_id are required" }, { status: 400 });
        }

        const vehicleDoc = {
            plate_number: plateNumber.trim().toUpperCase(),
            type: type,
            capacity: capacity || "0",
            driver_name: driverName || "Unassigned",
            driver_id: driverId || "",
            driver_phone: driver_phone || "",
            driver_photo: driver_photo || "",
            fuel_type: fuelType || "",
            organization_id,
            status: "off-duty",
            progress: 0,
            brand_model: brand_model || "",
            year: year || "",
            backup_driver_id: backup_driver_id || "",
            backup_driver_name: backup_driver_name || "",
            rc_expiry: rc_expiry || "",
            insurance_expiry: insurance_expiry || "",
            puc_expiry: puc_expiry || "",
            fitness_expiry: fitness_expiry || "",
            permit_expiry: permit_expiry || "",
            last_service_date: last_service_date || "",
            next_service_due_date: next_service_due_date || "",
            odometer: odometer || 0,
            gps_device_id: gps_device_id || "",
            rfid_device_id: rfid_device_id || "",
            camera_installed: !!camera_installed,
            panic_button_available: !!panic_button_available,
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
