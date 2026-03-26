import { db } from "./firebase"
import { collection, addDoc } from "firebase/firestore"

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

export async function clientAuditLog(log: Omit<AuditLog, "timestamp">) {
    try {
        await addDoc(collection(db, "audit_logs"), {
            ...log,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Failed to create audit log (client):", error);
    }
}
