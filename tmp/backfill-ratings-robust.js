const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
        }
        env[key] = value;
    }
});

const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const serviceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};

if (!serviceAccount.projectId || !serviceAccount.privateKey) {
    console.error("Missing required env variables in .env.local");
    process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, "transifydb");

async function run() {
    try {
        console.log("Fetching drivers...");
        const driversSnapshot = await db.collection("drivers").get();
        const driverMap = {};
        driversSnapshot.docs.forEach(doc => {
            driverMap[doc.data().name] = doc.id;
            console.log(`Driver: ${doc.data().name} -> ${doc.id}`);
        });

        console.log("Fetching ratings...");
        const ratingsSnapshot = await db.collection("ratings").get();
        console.log(`Found ${ratingsSnapshot.size} ratings.`);
        
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
        process.exit(0);
    } catch (err) {
        console.error("Execution error:", err);
        process.exit(1);
    }
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
