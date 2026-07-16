// One-off repair: some participants ended up with their prediction for match 89
// (Paraguay vs Francia) and match 90 (Canadá vs Marruecos) cross-swapped —
// the "winner" they picked for 89 actually belongs to 90's teams and vice versa.
// This only swaps a participant's pair when both sides clearly belong to the
// OTHER match; anything ambiguous (a winner that isn't a team in either match)
// is left untouched and logged for manual review.
const admin = require('firebase-admin');

const MATCH_A_ID = '89';
const MATCH_B_ID = '90';

async function main() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const mainMatches = db.collection('quiniela').doc('main').collection('matches');
  const [matchADoc, matchBDoc] = await Promise.all([
    mainMatches.doc(MATCH_A_ID).get(),
    mainMatches.doc(MATCH_B_ID).get()
  ]);
  const matchA = matchADoc.data();
  const matchB = matchBDoc.data();

  const teamsA = [matchA.teamA, matchA.teamB];
  const teamsB = [matchB.teamA, matchB.teamB];

  console.log(`Match ${MATCH_A_ID}: ${teamsA.join(' vs ')}`);
  console.log(`Match ${MATCH_B_ID}: ${teamsB.join(' vs ')}`);

  const predictionsCol = db.collection('quiniela').doc('main').collection('predictions');
  const predictionsSnap = await predictionsCol.get();

  let swapped = 0, ok = 0, skippedIncomplete = 0, flagged = 0;

  for (const doc of predictionsSnap.docs) {
    const data = doc.data();
    const predA = data[MATCH_A_ID];
    const predB = data[MATCH_B_ID];

    if (!predA || !predB) {
      skippedIncomplete++;
      continue;
    }

    const aWinnerBelongsToA = !predA.winner || teamsA.includes(predA.winner);
    const bWinnerBelongsToB = !predB.winner || teamsB.includes(predB.winner);
    const aWinnerBelongsToB = predA.winner && teamsB.includes(predA.winner);
    const bWinnerBelongsToA = predB.winner && teamsA.includes(predB.winner);

    if (aWinnerBelongsToA && bWinnerBelongsToB) {
      // Already consistent — leave alone.
      ok++;
      continue;
    }

    if (aWinnerBelongsToB && bWinnerBelongsToA) {
      // Clean swap: what's stored under 89 belongs to 90 and vice versa.
      await predictionsCol.doc(doc.id).update({
        [MATCH_A_ID]: predB,
        [MATCH_B_ID]: predA
      });
      console.log(`Swapped participant ${doc.id}: ${MATCH_A_ID}<->${MATCH_B_ID} (was "${predA.winner}"/"${predB.winner}")`);
      swapped++;
      continue;
    }

    // Doesn't fit the clean-swap pattern — flag for manual review, don't touch.
    console.log(`FLAGGED participant ${doc.id}: ${MATCH_A_ID}.winner="${predA.winner}" ${MATCH_B_ID}.winner="${predB.winner}" — doesn't match either match's teams, left untouched.`);
    flagged++;
  }

  console.log(`\nDone. Swapped: ${swapped}, already OK: ${ok}, incomplete (skipped): ${skippedIncomplete}, flagged for manual review: ${flagged}.`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
