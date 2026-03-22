import { adminDb } from "../lib/firebase-admin";

async function checkLogs() {
    try {
        const snap = await adminDb.collection("audit_logs").limit(5).get();
        console.log("Total logs found (limit 5):", snap.size);
        snap.forEach(doc => {
            console.log("Log ID:", doc.id, "Data:", JSON.stringify(doc.data()));
        });

        // Check for specific organization
        const orgId = "org_123"; // Adjust if you know the real org ID
        const orgSnap = await adminDb.collection("audit_logs").where("organization_id", "==", orgId).limit(5).get();
        console.log(`Logs for ${orgId}:`, orgSnap.size);
    } catch (err) {
        console.error("Error checking logs:", err);
    }
}

checkLogs();
