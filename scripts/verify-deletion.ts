import { adminDb } from "../lib/firebase-admin";

async function verifyData() {
    const driverId = "qMRemL";
    const driverSnap = await adminDb.collection("drivers").doc(driverId).get();
    
    if (driverSnap.exists) {
        console.log("Driver Data:", JSON.stringify(driverSnap.data(), null, 2));
    } else {
        console.log("Driver not found:", driverId);
    }

    const vehicleSnap = await adminDb.collection("vehicles").where("driver_id", "==", driverId).get();
    console.log(`Vehicles with primary driver ${driverId}:`, vehicleSnap.size);
    vehicleSnap.forEach(doc => {
        console.log("Vehicle ID:", doc.id, "Data:", JSON.stringify(doc.data(), null, 2));
    });

    const backupSnap = await adminDb.collection("vehicles").where("backup_driver_id", "==", driverId).get();
    console.log(`Vehicles with backup driver ${driverId}:`, backupSnap.size);
    backupSnap.forEach(doc => {
        console.log("Vehicle ID:", doc.id, "Data:", JSON.stringify(doc.data(), null, 2));
    });
}

verifyData().catch(console.error);
