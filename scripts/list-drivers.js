const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.+)$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.includes('\\n')) value = value.replace(/\\n/g, '\n');
    envConfig[match[1]] = value;
  }
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: envConfig.FIREBASE_PROJECT_ID,
      clientEmail: envConfig.FIREBASE_CLIENT_EMAIL,
      privateKey: envConfig.FIREBASE_PRIVATE_KEY,
    }),
  });
}

const db = admin.firestore();

async function listDrivers() {
  const snapshot = await db.collection('drivers').get();
  let output = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    output += `${data.name}: "${data.phone}"\n`;
  });
  fs.writeFileSync('driver-dump.txt', output);
  console.log("Dumped to driver-dump.txt");
}

listDrivers().catch(console.error);
