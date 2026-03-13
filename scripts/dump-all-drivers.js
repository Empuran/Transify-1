const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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

const serviceAccount = {
  projectId: envConfig.FIREBASE_PROJECT_ID,
  clientEmail: envConfig.FIREBASE_CLIENT_EMAIL,
  privateKey: envConfig.FIREBASE_PRIVATE_KEY,
};

const app = initializeApp({
  credential: cert(serviceAccount),
}, 'data-listing-app');

async function listAllDrivers() {
  const logFile = path.resolve(process.cwd(), 'all-drivers-dump.txt');
  let output = "Listing all drivers from both (default) and transifydb\n\n";

  const dumpDb = async (dbId) => {
    output += `--- Database: ${dbId || "(default)"} ---\n`;
    try {
      const db = getFirestore(app, dbId);
      const snapshot = await db.collection('drivers').get();
      output += `Documents found: ${snapshot.size}\n`;
      snapshot.forEach(doc => {
        const data = doc.data();
        output += `ID: ${doc.id} | Name: ${data.name} | Phone: "${data.phone}"\n`;
      });
      output += "\n";
    } catch (err) {
      output += `Error: ${err.message}\n\n`;
    }
  };

  await dumpDb(""); // default
  await dumpDb("transifydb");

  fs.writeFileSync(logFile, output);
  console.log(`Results written to ${logFile}`);
}

listAllDrivers().catch(console.error);
