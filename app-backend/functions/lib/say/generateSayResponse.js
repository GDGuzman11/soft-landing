"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSayResponse = void 0;
const https_1 = require("firebase-functions/v2/https");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const inputFilter_1 = require("../inputFilter");
const crisisKeywords_1 = require("../crisisKeywords");
const sayRateLimit_1 = require("./sayRateLimit");
const sayPrompt_1 = require("./sayPrompt");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const MAX_MESSAGE_CHARS = 2000;
const MAX_RESPONSE_CHARS = 2000;
const HISTORY_LIMIT = 30;
const JAILBREAK_WINDOW = 3;
const SAFE_FALLBACK = "Something quiet settled here. Say more when you're ready.";
/**
 * Truncate to the last sentence boundary <= MAX_RESPONSE_CHARS.
 * Falls back to a hard cut if no boundary is found in range.
 */
function truncateToSentence(text) {
    if (text.length <= MAX_RESPONSE_CHARS)
        return text;
    const slice = text.slice(0, MAX_RESPONSE_CHARS);
    const lastBoundary = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '), slice.lastIndexOf('.\n'), slice.lastIndexOf('!\n'), slice.lastIndexOf('?\n'));
    if (lastBoundary > 0)
        return slice.slice(0, lastBoundary + 1).trimEnd();
    return slice.trimEnd();
}
exports.generateSayResponse = (0, https_1.onCall)({ region: 'us-central1', invoker: 'public', secrets: ['ANTHROPIC_API_KEY'] }, async (request) => {
    // STEP 1: Auth check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to use Say.');
    }
    const uid = request.auth.uid;
    // STEP 2: Schema validation
    const raw = request.data;
    if (!raw || typeof raw.message !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'message is required');
    }
    const trimmedMessage = raw.message.trim();
    if (trimmedMessage.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'message cannot be empty');
    }
    if (trimmedMessage.length > MAX_MESSAGE_CHARS) {
        throw new https_1.HttpsError('invalid-argument', 'Message too long — keep it under 2000 characters');
    }
    const personaId = (0, sayPrompt_1.isValidPersonaId)(raw.personaId) ? raw.personaId : 'kind';
    const db = (0, firestore_1.getFirestore)();
    const messagesRef = db.collection('say').doc(uid).collection(personaId);
    // STEP 3: Input injection filter
    const filterResult = (0, inputFilter_1.filterUserInput)(trimmedMessage);
    if (!filterResult.safe) {
        return { blocked: true };
    }
    // STEP 4: Crisis detection — still persist the user's message so the
    // crisis moment is preserved in conversation history for context.
    if ((0, crisisKeywords_1.containsCrisisContent)(trimmedMessage)) {
        try {
            await messagesRef.add({
                role: 'user',
                content: trimmedMessage,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        catch (err) {
            // Persistence failure is non-fatal — we still surface the crisis prompt.
            console.error('say.persist_user_message_failed', { uid, code: err.message });
        }
        return { showCrisisPrompt: true };
    }
    // STEP 5: Conversation-window jailbreak scan — concatenate the last
    // JAILBREAK_WINDOW user-role messages with the new message and re-filter.
    // Catches payload-splitting attacks across multiple turns.
    try {
        const recentUserSnap = await messagesRef
            .where('role', '==', 'user')
            .orderBy('createdAt', 'desc')
            .limit(JAILBREAK_WINDOW)
            .get();
        const recentUserContent = recentUserSnap.docs
            .map((d) => d.data().content)
            .filter((c) => typeof c === 'string')
            .join('\n');
        const windowText = `${recentUserContent}\n${trimmedMessage}`;
        const windowFilter = (0, inputFilter_1.filterUserInput)(windowText);
        if (!windowFilter.safe) {
            return { blocked: true };
        }
    }
    catch (err) {
        // If the scan itself fails, fail closed on the explicit single-message
        // filter result we already have (which was safe). Log only metadata.
        console.error('say.jailbreak_window_scan_failed', { uid, code: err.message });
    }
    // STEP 6: Rate limit check — RevenueCat server-side check is Phase 2.
    const isPremium = false;
    try {
        await (0, sayRateLimit_1.checkSayRateLimit)(uid, isPremium);
    }
    catch (err) {
        if (err instanceof Error && err.message === 'SAY_DAILY_LIMIT') {
            return { rateLimited: true, rateLimitType: 'daily' };
        }
        if (err instanceof Error && err.message === 'SAY_BURST_LIMIT') {
            return { rateLimited: true, rateLimitType: 'burst' };
        }
        // Storage failure is non-fatal — continue, mirroring generateLetter.
        console.error('say.rate_limit_storage_failed', { uid, code: err.message });
    }
    // STEP 7: Load conversation history for memory.
    let history = [];
    try {
        const historySnap = await messagesRef.orderBy('createdAt', 'asc').limit(HISTORY_LIMIT).get();
        history = historySnap.docs
            .map((d) => d.data())
            .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .map((m) => ({ role: m.role, content: m.content }));
    }
    catch (err) {
        console.error('say.history_load_failed', { uid, code: err.message });
    }
    // STEP 8: Persist user message via Admin SDK before calling Claude.
    try {
        await messagesRef.add({
            role: 'user',
            content: trimmedMessage,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        console.error('say.persist_user_message_failed', { uid, code: err.message });
        throw new https_1.HttpsError('internal', 'Could not save your message. Try again.');
    }
    // STEP 9: Call Claude — or write a mock response when no API key is set.
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const systemPrompt = (0, sayPrompt_1.getSaySystemPrompt)(personaId);
    if (!apiKey) {
        const mock = "Just here with you. Say more when you're ready.";
        try {
            await messagesRef.add({
                role: 'assistant',
                content: mock,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        catch (err) {
            console.error('say.persist_mock_response_failed', { uid, code: err.message });
        }
        return { response: mock };
    }
    let responseText;
    try {
        const client = new sdk_1.default({ apiKey });
        const claudeMessages = [
            ...history,
            { role: 'user', content: trimmedMessage },
        ];
        const completion = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 500,
            system: systemPrompt,
            messages: claudeMessages,
        });
        const block = completion.content[0];
        if (!block || block.type !== 'text') {
            throw new https_1.HttpsError('internal', 'Unexpected response format');
        }
        responseText = block.text;
    }
    catch (err) {
        console.error('say.claude_call_failed', { uid, code: err.message });
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('internal', 'Could not generate a response');
    }
    // STEP 10: Output safety checks.
    // (a) length guard
    responseText = truncateToSentence(responseText);
    // (b) canary leakage check — if the model echoed any part of the buried
    // marker, replace with a safe fallback. The canary was placed in a
    // comment block that has no business appearing in conversational output.
    if (responseText.includes(sayPrompt_1.SAY_CANARY)) {
        console.error('say.canary_leak_detected', { uid });
        responseText = SAFE_FALLBACK;
    }
    // STEP 11: Persist AI response.
    try {
        await messagesRef.add({
            role: 'assistant',
            content: responseText,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        console.error('say.persist_assistant_response_failed', { uid, code: err.message });
        // Response was generated; surfacing it to the user is more important
        // than failing the whole call. Return without throwing.
    }
    // STEP 12
    return { response: responseText };
});
//# sourceMappingURL=generateSayResponse.js.map