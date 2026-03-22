import { adminDb } from "../lib/firebase-admin";

async function dumpVehicles() {
    const snapshot = await adminDb.collection("vehicles").get();
    console.log(`Total vehicles: ${snapshot.size}`);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Vehicle ${data.plate_number}:`, JSON.stringify({
            id: doc.id,
            org: data.organization_id,
            driver_id: data.driver_id,
            driver_name: data.driver_name,
            backup_id: data.backup_driver_id,
            backup_name: data.backup_driver_name
        }, null, 2));
    });
}

dumpVehicles().catch(console.error);
