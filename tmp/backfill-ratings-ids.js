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

async function run() {
    try {
        console.log("Fetching drivers...");
        const driversSnapshot = await db.collection("drivers").get();
        const driverMap = {};
        driversSnapshot.docs.forEach(doc => {
            driverMap[doc.data().name] = doc.id;
        });

        console.log("Fetching ratings...");
        const ratingsSnapshot = await db.collection("ratings").get();
        
        const batch = db.batch();
        let count = 0;

        for (const doc of ratingsSnapshot.docs) {
            const r = doc.data();
            if (!r.driver_id && r.driver_name) {
                const driverId = driverMap[r.driver_name];
                if (driverId) {
                    batch.update(doc.ref, { driver_id: driverId });
                    count++;
                }
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`Successfully backfilled driver_id in ${count} ratings.`);
        } else {
            console.log("No ratings needed backfilling.");
        }

    } catch (err) {
        console.error("Execution error:", err);
    }
}

run().catch(console.error);
