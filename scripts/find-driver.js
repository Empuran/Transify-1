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

async function findDriver() {
  const phoneToFind = "8289871896";
  const logFile = path.resolve(process.cwd(), 'driver-search-result.txt');
  let output = `Searching Default Database for: ${phoneToFind}\n\n`;
  
  try {
    const snapshot = await db.collection('drivers').get();
    let foundCount = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.phone && data.phone.includes(phoneToFind)) {
        output += `FOUND! ID: ${doc.id}\n`;
        output += `Name: ${data.name}\n`;
        output += `Phone: "${data.phone}"\n`;
        foundCount++;
      }
    });
    output += `Found ${foundCount} matches in (default)\n`;
  } catch (err) {
    output += `Error accessing (default): ${err.message}\n`;
  }
  
  fs.writeFileSync(logFile, output);
  console.log(`Results written to ${logFile}`);
}

findDriver().catch(console.error);
