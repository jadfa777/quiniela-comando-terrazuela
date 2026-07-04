/**
 * One-time script: fixes swapped teams for octavos in Firestore (Quiniela Comando Terrazuela).
 * Run: FIREBASE_SERVICE_ACCOUNT='...' node fix-octavos-teams.js
 */
const admin = require('firebase-admin');

const FIXES = [
  { id: '89', teamA: 'Canadá',   teamB: 'Marruecos' },
  { id: '90', teamA: 'Paraguay', teamB: 'Francia'   },
];

async function main() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  for (const fix of FIXES) {
    const ref = db.collection('quiniela').doc('main').collection('matches').doc(fix.id);
    const snap = await ref.get();
    if (!snap.exists) { console.log(`Match ${fix.id} not found — skipping`); continue; }
    const cur = snap.data();
    console.log(`Match ${fix.id}: "${cur.teamA}" vs "${cur.teamB}" → "${fix.teamA}" vs "${fix.teamB}"`);
    await ref.update({ teamA: fix.teamA, teamB: fix.teamB });
  }

  console.log('Done.');
  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
