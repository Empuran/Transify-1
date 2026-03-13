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

// Note: Admin SDK doesn't have a direct "listDatabases" in the old style,
// but we can try to access transifydb and see if it errors or works.
// Or better, use the Firestore Admin API if possible.
const { Firestore } = require('@google-cloud/firestore');

async function checkDatabases() {
  const firestoreAdmin = new admin.firestore.v1.FirestoreAdminClient({
    credentials: {
      client_email: envConfig.FIREBASE_CLIENT_EMAIL,
      private_key: envConfig.FIREBASE_PRIVATE_KEY,
    },
    projectId: envConfig.FIREBASE_PROJECT_ID,
  });

  console.log(`Checking databases for project: ${envConfig.FIREBASE_PROJECT_ID}`);
  try {
    const [databases] = await firestoreAdmin.listDatabases({
      parent: `projects/${envConfig.FIREBASE_PROJECT_ID}`,
    });
    
    console.log("Databases found:");
    databases.forEach(db => {
      console.log(`- ${db.name}`);
    });
  } catch (err) {
    console.error("Error listing databases:", err.message);
  }
}

checkDatabases().catch(console.error);
