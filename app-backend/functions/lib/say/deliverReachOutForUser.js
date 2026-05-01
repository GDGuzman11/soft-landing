"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverReachOutForUser = deliverReachOutForUser;
const firestore_1 = require("firebase-admin/firestore");
const reachOutMessages_1 = require("./reachOutMessages");
const ALL_PERSONAS = ['kind', 'still', 'steady', 'wise'];
const DAILY_LIMIT = 1;
const WEEKLY_LIMIT = 3;
const REACH_OUT_COOLDOWN_MS = 48 * 60 * 60 * 1000;
const ACTIVE_CONVO_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECENTLY_USED_MAX = 60;
const VOICE_NAMES = {
    kind: 'Kind',
    still: 'Still',
    steady: 'Steady',
    wise: 'Wise',
};
function isInValidTimeWindow(offsetHours) {
    const nowUtc = Date.now();
    const localMs = nowUtc + offsetHours * 60 * 60 * 1000;
    const localHour = new Date(localMs).getUTCHours();
    // Valid: 8-10am or 9-11pm local
    return (localHour >= 8 && localHour < 10) || (localHour >= 21 && localHour < 23);
}
function nextUtcMidnight() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}
function nextMondayUtcMidnight() {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
}
// Weighted pick — more messages to a voice = higher probability it "texts".
// Min weight of 1 keeps voices the user has never engaged eligible at low probability.
function weightedPick(voices, counts) {
    const weights = voices.map((v) => Math.max(counts[v] ?? 0, 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < voices.length; i++) {
        r -= weights[i];
        if (r <= 0)
            return voices[i];
    }
    return voices[voices.length - 1];
}
async function sendExpoPush(token, title, body) {
    try {
        await fetch('https://exp.host/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify([{ to: token, title, body, sound: 'default' }]),
        });
    }
    catch {
        // Best-effort — don't fail delivery if push fails
    }
}
async function deliverReachOutForUser(uid, timezoneOffset, db) {
    // Check time window
    if (!isInValidTimeWindow(timezoneOffset)) {
        return { delivered: false };
    }
    const deliveryRef = db.collection('sayReachOutDelivery').doc(uid);
    const stateRef = db.collection('sayState').doc(uid);
    const now = Date.now();
    // Load delivery doc
    const deliverySnap = await deliveryRef.get();
    const delivery = deliverySnap.data();
    // Check and reset daily counter
    let dailyCount = delivery?.dailyCount ?? 0;
    const dailyResetAt = delivery?.dailyResetAt?.toMillis() ?? 0;
    if (now >= dailyResetAt)
        dailyCount = 0;
    if (dailyCount >= DAILY_LIMIT)
        return { delivered: false };
    // Check and reset weekly counter
    let weeklyCount = delivery?.weeklyCount ?? 0;
    const weeklyResetAt = delivery?.weeklyResetAt?.toMillis() ?? 0;
    if (now >= weeklyResetAt)
        weeklyCount = 0;
    if (weeklyCount >= WEEKLY_LIMIT)
        return { delivered: false };
    const recentlyUsed = delivery?.recentlyUsed ?? [];
    // Load sayState (single doc with map fields keyed by personaId)
    const stateSnap = await stateRef.get().catch(() => null);
    const stateData = stateSnap?.data();
    // Find eligible voices
    const eligibleVoices = [];
    const messageCounts = {};
    for (const personaId of ALL_PERSONAS) {
        const voiceState = stateData?.[personaId];
        // Check muted
        if (voiceState?.muted)
            continue;
        // Check 48h cooldown since last reach-out to this voice
        const lastReachOut = voiceState?.lastReachOutAt?.toMillis() ?? 0;
        if (now - lastReachOut < REACH_OUT_COOLDOWN_MS)
            continue;
        // Active conversation check — skip this voice if user sent a message in last 24h
        try {
            const recentUserSnap = await db
                .collection('say').doc(uid).collection(personaId)
                .where('role', '==', 'user')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            if (!recentUserSnap.empty) {
                const lastMsg = recentUserSnap.docs[0].data();
                const lastMsgTime = lastMsg.createdAt?.toMillis() ?? 0;
                if (now - lastMsgTime < ACTIVE_CONVO_WINDOW_MS)
                    continue;
            }
        }
        catch {
            // Recency query failed — fall through and treat as eligible
        }
        // Total user message count for weighted selection
        try {
            const countSnap = await db
                .collection('say').doc(uid).collection(personaId)
                .where('role', '==', 'user')
                .count()
                .get();
            messageCounts[personaId] = countSnap.data().count;
        }
        catch {
            messageCounts[personaId] = 0;
        }
        eligibleVoices.push(personaId);
    }
    if (eligibleVoices.length === 0)
        return { delivered: false };
    // Weighted pick — voices with more user messages have higher probability
    const personaId = weightedPick(eligibleVoices, messageCounts);
    if (!personaId)
        return { delivered: false };
    // Pick a message not used recently
    const voicePool = reachOutMessages_1.REACH_OUT_POOLS[personaId];
    if (!voicePool || voicePool.length === 0)
        return { delivered: false };
    // recentlyUsed entries: "personaId:index"
    const usedIndices = new Set(recentlyUsed
        .filter((k) => k.startsWith(`${personaId}:`))
        .map((k) => parseInt(k.split(':')[1] ?? '-1', 10)));
    const availableIndices = voicePool
        .map((_, i) => i)
        .filter((i) => !usedIndices.has(i));
    const pickFrom = availableIndices.length > 0 ? availableIndices : voicePool.map((_, i) => i);
    const pickedIndex = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    if (typeof pickedIndex !== 'number')
        return { delivered: false };
    const picked = voicePool[pickedIndex];
    if (!picked)
        return { delivered: false };
    // Write the reach-out message to /say/{uid}/{personaId}/
    const msgRef = db.collection('say').doc(uid).collection(personaId).doc();
    await msgRef.set({
        role: 'reachOut',
        content: picked.text,
        ...(picked.reference ? { reference: picked.reference } : {}),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // Update /sayState/{uid} — merge the per-voice map field.
    await stateRef.set({
        [personaId]: {
            hasUnread: true,
            lastReachOutAt: firestore_1.FieldValue.serverTimestamp(),
        },
    }, { merge: true });
    // Update delivery rate-limit doc
    const newRecentlyUsed = [...recentlyUsed, `${personaId}:${pickedIndex}`].slice(-RECENTLY_USED_MAX);
    const newDailyResetAt = now >= dailyResetAt ? nextUtcMidnight() : new Date(dailyResetAt);
    const newWeeklyResetAt = now >= weeklyResetAt ? nextMondayUtcMidnight() : new Date(weeklyResetAt);
    await deliveryRef.set({
        dailyCount: dailyCount + 1,
        dailyResetAt: firestore_1.Timestamp.fromDate(newDailyResetAt),
        weeklyCount: weeklyCount + 1,
        weeklyResetAt: firestore_1.Timestamp.fromDate(newWeeklyResetAt),
        recentlyUsed: newRecentlyUsed,
    }, { merge: true });
    // Fire push notification if user has a token, is premium, and hasn't muted this voice.
    // Best-effort — never fail delivery on push errors.
    try {
        const tokenSnap = await db.collection('pushTokens').doc(uid).get();
        const tokenData = tokenSnap.data();
        const isMuted = tokenData?.mutedVoices?.includes(personaId) ?? false;
        if (tokenData?.token && tokenData.isPremium && !isMuted) {
            await sendExpoPush(tokenData.token, VOICE_NAMES[personaId] ?? personaId, picked.text);
        }
    }
    catch {
        // Don't fail delivery if push lookup fails
    }
    return { delivered: true, personaId };
}
//# sourceMappingURL=deliverReachOutForUser.js.map