"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 20;
async function checkRateLimit(uid) {
    const db = (0, firestore_1.getFirestore)();
    const ref = db.collection('letterUsage').doc(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();
        if (!snap.exists) {
            tx.set(ref, { count: 1, windowStart: now });
            return;
        }
        const data = snap.data();
        const windowExpired = now - data.windowStart > WINDOW_MS;
        if (windowExpired) {
            tx.set(ref, { count: 1, windowStart: now });
            return;
        }
        if (data.count >= MAX_REQUESTS) {
            throw new Error('RATE_LIMIT_EXCEEDED');
        }
        tx.update(ref, { count: firestore_1.FieldValue.increment(1) });
    });
}
//# sourceMappingURL=rateLimit.js.map