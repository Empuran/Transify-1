const admin = require('firebase-admin');
const sa = require('./transify-service-account.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function checkAlerts() {
  try {
    const snap = await db.collection('alerts')
      .orderBy('created_at', 'desc')
      .limit(30)
      .get();
    
    console.log(`Found ${snap.docs.length} alerts`);
    snap.docs.forEach((doc, idx) => {
      const d = doc.data();
      console.log(`[${idx}] Type: ${d.type} | Title: ${d.title} | Student: ${d.student_name} | Stop: ${d.stop_name} | Created: ${d.created_at?.toDate()}`);
    });
  } catch(e) { console.error(e); }
  process.exit(0);
}
checkAlerts();
