
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, "transifydb");

async function backfill() {
    console.log("Starting backfill of driver_id in vehicles...");

    // 1. Get all drivers
    const driversSnap = await db.collection("drivers").get();
    const driversByName = {};
    driversSnap.forEach(doc => {
        const d = doc.data();
        if (d.name) {
            driversByName[d.name] = doc.id;
        }
    });

    console.log(`Found ${Object.keys(driversByName).length} drivers.`);

    // 2. Get all vehicles
    const vehiclesSnap = await db.collection("vehicles").get();
    let updatedCount = 0;

    for (const vehicleDoc of vehiclesSnap.docs) {
        const v = vehicleDoc.data();
        const driverName = v.driver_name;
        
        if (driverName && driverName !== "Not Assigned" && !v.driver_id) {
            const driverId = driversByName[driverName];
            if (driverId) {
                console.log(`Linking vehicle ${v.plate_number} to driver ${driverName} (${driverId})`);
                await vehicleDoc.ref.update({
                    driver_id: driverId
                });
                updatedCount++;
            } else {
                console.log(`No driver found for name: ${driverName} (Vehicle: ${v.plate_number})`);
            }
        }
    }

    console.log(`Successfully updated ${updatedCount} vehicles.`);
}

backfill().catch(console.error);
