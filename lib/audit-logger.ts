import { adminDb } from "./firebase-admin";

export interface AuditLog {
    action: "add" | "update" | "delete" | "login";
    entity_type: "driver" | "vehicle" | "route" | "student" | "system";
    entity_id: string;
    admin_id: string;
    admin_name?: string;
    admin_email: string;
    organization_id: string;
    details: string;
    timestamp: string;
}

/** Maps raw Firestore/form field keys to readable UI label names */
export const FIELD_LABELS: Record<string, string> = {
    // Student fields
    name: "Full Name",
    grade: "Class / Grade",
    section: "Section",
    parentPhone: "Parent Phone",
    parent_phone: "Parent Phone",
    route: "Assign Route",
    vehicle_id: "Assign Vehicle",
    boarding_point: "Boarding Point",
    dropoff_point: "Drop-off Point",
    memberId: "Member ID",
    organization: "Organization",
    // Driver fields
    phone: "Phone",
    license_number: "License Number",
    license_type: "License Type",
    // Vehicle fields
    plate_number: "Plate Number",
    type: "Type",
    capacity: "Capacity",
    driver_name: "Driver",
    fuel_type: "Fuel Type",
    brand_model: "Brand / Model",
    year: "Year",
    backup_driver_name: "Backup Driver",
    rc_expiry: "RC Expiry",
    insurance_expiry: "Insurance Expiry",
    puc_expiry: "PUC Expiry",
    fitness_expiry: "Fitness Certificate Expiry",
    permit_expiry: "Permit Expiry",
    last_service_date: "Last Service Date",
    next_service_due_date: "Next Service Date",
    odometer: "Odometer",
    gps_device_id: "GPS Device ID",
    rfid_device_id: "RFID Device ID",
    camera_installed: "Camera Installed",
    panic_button_available: "Panic Button",
    // Route fields
    route_name: "Route Name",
    start_point: "Start Point",
    end_point: "End Point",
    stops: "Stops",
    distance_km: "Distance (km)",
};

/** Internal/system fields that should NOT appear in audit log details */
const SKIP_FIELDS = new Set([
    "updated_at", "created_at", "route_id", "driver_id", "backup_driver_id",
    "start_lat", "start_lng", "end_lat", "end_lng", "organization_id",
    "status", "route_name_normalized",
]);

/** Convert a field key to a readable label for audit logs */
export function formatFieldName(key: string): string {
    return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/** Compute the list of actually-changed fields, mapping them to UI label names */
export function getChangedFieldLabels(
    updates: Record<string, any>,
    existing: Record<string, any> | undefined
): string[] {
    return Object.keys(updates)
        .filter(k => !SKIP_FIELDS.has(k))
        .filter(k => {
            const newVal = updates[k];
            const oldVal = existing?.[k];
            // For nested objects (boarding_point, dropoff_point), compare by .name property
            if (newVal && typeof newVal === "object" && !Array.isArray(newVal) && "name" in newVal) {
                return (oldVal?.name ?? null) !== (newVal?.name ?? null);
            }
            return JSON.stringify(newVal) !== JSON.stringify(oldVal);
        })
        .map(k => formatFieldName(k));
}

export async function createAuditLog(log: Omit<AuditLog, "timestamp">) {
    try {
        await adminDb.collection("audit_logs").add({
            ...log,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
}
