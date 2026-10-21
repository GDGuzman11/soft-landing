const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'soft-landing-afe2d' });
const db = admin.firestore();
const [,, uid, persona, chatId] = process.argv;
(async () => {
  try {
    const snap = await db.collection(`say/${uid}/${persona}/${chatId}/messages`).orderBy('createdAt').get();
    console.log(`COUNT=${snap.size}`);
    snap.forEach(d => {
      const x = d.data();
      console.log(JSON.stringify({ id: d.id, role: x.role, text: x.text || x.content || x.message, createdAt: x.createdAt }, null, 0));
    });
  } catch (e) {
    console.error('ERR', e.message);
  }
  process.exit(0);
})();
