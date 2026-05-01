"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledReachOut = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const deliverReachOutForUser_1 = require("./deliverReachOutForUser");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.scheduledReachOut = (0, scheduler_1.onSchedule)({ schedule: 'every 30 minutes', region: 'us-central1' }, async () => {
    const db = (0, firestore_1.getFirestore)();
    const tokenSnaps = await db.collection('pushTokens').get();
    await Promise.allSettled(tokenSnaps.docs
        .filter((doc) => {
        const d = doc.data();
        return d.token && d.isPremium === true;
    })
        .map(async (doc) => {
        const { timezoneOffset } = doc.data();
        await (0, deliverReachOutForUser_1.deliverReachOutForUser)(doc.id, timezoneOffset ?? 0, db);
    }));
});
//# sourceMappingURL=scheduledReachOut.js.map