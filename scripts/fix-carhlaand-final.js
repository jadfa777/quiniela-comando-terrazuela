// One-off repair: Carhlaand's Final (match 104) prediction was a 0-0 draw whose
// stored "winner" ("Argentina") was orphaned — Argentina isn't one of the two
// teams in Carhlaand's own bracket for that match (Francia vs Inglaterra), left
// over from before an earlier-round pick was changed. Carhlaand's actual call:
// England champion, France runner-up. This sets that explicitly instead of
// leaving the podium blank pending a manual re-pick in the UI.
const admin = require('firebase-admin');

const PARTICIPANT_ID = '1781266534720'; // Carhlaand
const MATCH_ID = '104';
const CHAMPION_PICK = 'Inglaterra';

async function main() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const ref = db.collection('quiniela').doc('main')
    .collection('predictions').doc(PARTICIPANT_ID);

  const doc = await ref.get();
  const before = doc.data()[MATCH_ID];
  console.log('Before:', JSON.stringify(before));

  await ref.update({ [`${MATCH_ID}.winner`]: CHAMPION_PICK });

  const after = (await ref.get()).data()[MATCH_ID];
  console.log('After:', JSON.stringify(after));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
