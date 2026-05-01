"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAY_LIMITS = void 0;
exports.checkSayRateLimit = checkSayRateLimit;
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
// Limits — separate from letterUsage so frontend can show distinct copy.
const FREE_DAILY_LIMIT = 100;
const PREMIUM_DAILY_LIMIT = 500;
const BURST_LIMIT = 20;
const BURST_WINDOW_MS = 60 * 1000; // 60 seconds
/**
 * Returns the UTC midnight that begins the calendar day AFTER `now`.
 * This is the moment dailyCount should next reset.
 */
function nextUtcMidnight(now) {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
    return next;
}
/**
 * Throws on rate limit:
 *   - 'SAY_DAILY_LIMIT' when dailyCount has hit the cap for the user's tier
 *   - 'SAY_BURST_LIMIT' when more than BURST_LIMIT messages have arrived
 *     inside the last BURST_WINDOW_MS
 *
 * Daily count resets at UTC midnight. We store `dailyResetAt` as the next
 * scheduled reset moment; if `now >= dailyResetAt` we are in a fresh day.
 */
async function checkSayRateLimit(uid, isPremium) {
    const db = (0, firestore_1.getFirestore)();
    const ref = db.collection('sayUsage').doc(uid);
    const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const nowDate = new Date();
        const nowTs = firestore_1.Timestamp.fromDate(nowDate);
        const nextResetTs = firestore_1.Timestamp.fromDate(nextUtcMidnight(nowDate));
        if (!snap.exists) {
            tx.set(ref, {
                dailyCount: 1,
                dailyResetAt: nextResetTs,
                lastMessageAt: nowTs,
                burstCount: 1,
                burstWindowStart: nowTs,
            });
            return;
        }
        const data = snap.data();
        // Daily window roll-over: if we've crossed the stored reset moment,
        // start a new day.
        const inNewDay = nowDate.getTime() >= data.dailyResetAt.toMillis();
        const nextDailyCount = inNewDay ? 1 : data.dailyCount + 1;
        const nextDailyResetAt = inNewDay ? nextResetTs : data.dailyResetAt;
        if (!inNewDay && data.dailyCount >= dailyLimit) {
            throw new Error('SAY_DAILY_LIMIT');
        }
        // Burst window: rolling 60s window
        const burstWindowExpired = nowDate.getTime() - data.burstWindowStart.toMillis() > BURST_WINDOW_MS;
        const nextBurstCount = burstWindowExpired ? 1 : data.burstCount + 1;
        const nextBurstWindowStart = burstWindowExpired ? nowTs : data.burstWindowStart;
        if (!burstWindowExpired && data.burstCount >= BURST_LIMIT) {
            throw new Error('SAY_BURST_LIMIT');
        }
        tx.update(ref, {
            dailyCount: nextDailyCount,
            dailyResetAt: nextDailyResetAt,
            lastMessageAt: nowTs,
            burstCount: nextBurstCount,
            burstWindowStart: nextBurstWindowStart,
            // Belt-and-braces: if you ever query, FieldValue.serverTimestamp() on
            // lastMessageAt would also be acceptable. We use client-derived `now`
            // here so the transaction stays deterministic across retries.
        });
    });
}
// Re-exported constants for tests and frontend coordination.
exports.SAY_LIMITS = {
    FREE_DAILY_LIMIT,
    PREMIUM_DAILY_LIMIT,
    BURST_LIMIT,
    BURST_WINDOW_MS,
};
//# sourceMappingURL=sayRateLimit.js.map