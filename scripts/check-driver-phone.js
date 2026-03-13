const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore().terminate().then(() => {
    const tdb = admin.firestore('transifydb');
    tdb.collection('drivers').get().then(snap => {
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id}, Name: ${data.name}, Phone: "${data.phone}"`);
        });
        process.exit(0);
    });
});
