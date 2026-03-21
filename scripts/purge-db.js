const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Poor man's dotenv
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1'); // strip quotes
    }
});

const serviceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, "transifydb");

async function run() {
    console.log("Fetching live_locations...");
    const snapshot = await db.collection("live_locations").get();
    
    if (snapshot.empty) {
        console.log("Database empty. No live locations to delete.");
        return;
    }

    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
    });

    await batch.commit();
    console.log(`Successfully purged ${count} locations from Firebase forever.`);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
