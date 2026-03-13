
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, "transifydb");

async function run() {
    let output = "";
    const log = (msg) => {
        output += msg + "\n";
        console.log(msg);
    };

    try {
        log("--- DRIVERS ---");
        const drivers = await db.collection("drivers").get();
        drivers.forEach(doc => {
            const d = doc.data();
            log(`ID: ${doc.id}, Name: ${d.name}, Avg: ${d.avg_rating}, total: ${d.total_ratings}`);
        });

        log("\n--- VEHICLES ---");
        const vehicles = await db.collection("vehicles").get();
        vehicles.forEach(doc => {
            const v = doc.data();
            log(`DocID: ${doc.id}, Plate: ${v.plate_number}, DriverName: ${v.driver_name}, DriverID: ${v.driver_id}`);
        });

        log("\n--- RATINGS (Newest 10) ---");
        const ratings = await db.collection("ratings").orderBy("timestamp", "desc").limit(10).get();
        ratings.forEach(doc => {
            const r = doc.data();
            log(`DocID: ${doc.id}, Rating: ${r.rating}, Driver: ${r.driver_name}, DriverID: ${r.driver_id || 'MISSING'}, Vehicle: ${r.vehicle_id}, Time: ${r.timestamp?.toDate ? r.timestamp.toDate().toISOString() : 'no-date'}`);
        });

        fs.writeFileSync('tmp/debug-output.txt', output);
        log("\nDone. Full results in tmp/debug-output.txt");
    } catch (err) {
        console.error("Execution error:", err);
    }
}

run().catch(console.error);
