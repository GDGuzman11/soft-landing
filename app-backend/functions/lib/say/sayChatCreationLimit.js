"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAY_CHAT_CREATION_LIMITS = void 0;
exports.checkSayChatCreationLimit = checkSayChatCreationLimit;
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
// Bounds how many NEW chats a user can create via startSayChat. This is a
// SEPARATE counter from the 100/day message cap in sayRateLimit.ts — chat
// creation is assistant-initiated and must not consume the user's message
// allowance. Purpose: cap unbounded chat-doc creation (cost/DoS).
const CHAT_DAILY_LIMIT = 30;
const CHAT_BURST_LIMIT = 5;
const CHAT_BURST_WINDOW_MS = 60 * 1000; // 60 seconds
/** UTC midnight that begins the calendar day AFTER `now`. */
function nextUtcMidnight(now) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
}
/**
 * Atomically reserve one chat-creation slot. Throws:
 *   - 'SAY_CHAT_DAILY_LIMIT' once CHAT_DAILY_LIMIT chats created today
 *   - 'SAY_CHAT_BURST_LIMIT' once CHAT_BURST_LIMIT chats created in the last
 *     CHAT_BURST_WINDOW_MS
 * The increment happens inside the transaction, so concurrent calls cannot both
 * slip past the cap.
 */
async function checkSayChatCreationLimit(uid) {
    const db = (0, firestore_1.getFirestore)();
    const ref = db.collection('sayChatCreation').doc(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const nowDate = new Date();
        const nowTs = firestore_1.Timestamp.fromDate(nowDate);
        const nextResetTs = firestore_1.Timestamp.fromDate(nextUtcMidnight(nowDate));
        if (!snap.exists) {
            tx.set(ref, {
                dailyCount: 1,
                dailyResetAt: nextResetTs,
                burstCount: 1,
                burstWindowStart: nowTs,
            });
            return;
        }
        const data = snap.data();
        const inNewDay = nowDate.getTime() >= data.dailyResetAt.toMillis();
        const nextDailyCount = inNewDay ? 1 : data.dailyCount + 1;
        const nextDailyResetAt = inNewDay ? nextResetTs : data.dailyResetAt;
        if (!inNewDay && data.dailyCount >= CHAT_DAILY_LIMIT) {
            throw new Error('SAY_CHAT_DAILY_LIMIT');
        }
        const burstWindowExpired = nowDate.getTime() - data.burstWindowStart.toMillis() > CHAT_BURST_WINDOW_MS;
        const nextBurstCount = burstWindowExpired ? 1 : data.burstCount + 1;
        const nextBurstWindowStart = burstWindowExpired ? nowTs : data.burstWindowStart;
        if (!burstWindowExpired && data.burstCount >= CHAT_BURST_LIMIT) {
            throw new Error('SAY_CHAT_BURST_LIMIT');
        }
        tx.update(ref, {
            dailyCount: nextDailyCount,
            dailyResetAt: nextDailyResetAt,
            burstCount: nextBurstCount,
            burstWindowStart: nextBurstWindowStart,
        });
    });
}
exports.SAY_CHAT_CREATION_LIMITS = {
    CHAT_DAILY_LIMIT,
    CHAT_BURST_LIMIT,
    CHAT_BURST_WINDOW_MS,
};
//# sourceMappingURL=sayChatCreationLimit.js.map