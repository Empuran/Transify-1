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
