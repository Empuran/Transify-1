const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

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

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, "transifydb");

async function listDrivers() {
    const snapshot = await db.collection("drivers").get();
    snapshot.docs.forEach(doc => {
        console.log(`Driver ID: ${doc.id}, Data: ${JSON.stringify(doc.data())}`);
    });
}

listDrivers().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
