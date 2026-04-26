"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLetter = void 0;
const https_1 = require("firebase-functions/v2/https");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const prompt_1 = require("./prompt");
const crisisKeywords_1 = require("./crisisKeywords");
const inputFilter_1 = require("./inputFilter");
const mockLetters_1 = require("./mockLetters");
const rateLimit_1 = require("./rateLimit");
const VALID_EMOTIONS = ['stressed', 'tired', 'sad', 'neutral', 'good'];
const VALID_FAITH_BACKGROUNDS = ['established', 'exploring', 'between'];
const VALID_LIFE_STAGES = ['early', 'middle', 'later'];
const VALID_INTENTS = ['peace', 'strength', 'comfort', 'guidance', 'exploring'];
function validateInputs(data) {
    if (!data.verseBody || typeof data.verseBody !== 'string' || data.verseBody.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'verseBody is required');
    }
    if (data.verseBody.length > 1000) {
        throw new https_1.HttpsError('invalid-argument', 'verseBody too long');
    }
    if (!data.emotionId || !VALID_EMOTIONS.includes(data.emotionId)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid emotionId is required');
    }
    if (data.userInput !== undefined && data.userInput.length > 1000) {
        throw new https_1.HttpsError('invalid-argument', 'Message too long — keep it under 1000 characters');
    }
    if (data.reference !== undefined && (typeof data.reference !== 'string' || data.reference.length > 100)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid reference');
    }
    if (data.userName !== undefined && (typeof data.userName !== 'string' || data.userName.length > 100)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid userName');
    }
    if (data.hourOfDay !== undefined && (typeof data.hourOfDay !== 'number' || data.hourOfDay < 0 || data.hourOfDay > 23)) {
        throw new https_1.HttpsError('invalid-argument', 'hourOfDay must be 0–23');
    }
    if (data.faithBackground !== undefined && data.faithBackground !== null && !VALID_FAITH_BACKGROUNDS.includes(data.faithBackground)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid faithBackground');
    }
    if (data.primaryIntent !== undefined && data.primaryIntent !== null && !VALID_INTENTS.includes(data.primaryIntent)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid primaryIntent');
    }
    if (data.lifeStage !== undefined && data.lifeStage !== null && !VALID_LIFE_STAGES.includes(data.lifeStage)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid lifeStage');
    }
}
exports.generateLetter = (0, https_1.onCall)({ region: 'us-central1', invoker: 'public', secrets: ['ANTHROPIC_API_KEY'] }, async (request) => {
    var _a, _b, _c;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to write a letter.');
    }
    const data = request.data;
    validateInputs(data);
    const { emotionId, verseBody, reference, userInput, userName, hourOfDay, faithBackground, primaryIntent, lifeStage } = data;
    console.log('[generateLetter] params', {
        emotionId,
        reference,
        verseLength: verseBody === null || verseBody === void 0 ? void 0 : verseBody.length,
        hasUserInput: !!userInput,
        userInputLength: (_a = userInput === null || userInput === void 0 ? void 0 : userInput.length) !== null && _a !== void 0 ? _a : 0,
        faithBackground: faithBackground !== null && faithBackground !== void 0 ? faithBackground : 'null',
        primaryIntent: primaryIntent !== null && primaryIntent !== void 0 ? primaryIntent : 'null',
        lifeStage: lifeStage !== null && lifeStage !== void 0 ? lifeStage : 'null',
        hourOfDay: hourOfDay !== null && hourOfDay !== void 0 ? hourOfDay : 'null',
        uid: ((_c = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) === null || _c === void 0 ? void 0 : _c.slice(0, 8)) + '…',
    });
    // Block malicious input before it reaches the AI
    if (userInput) {
        const filterResult = (0, inputFilter_1.filterUserInput)(userInput);
        if (!filterResult.safe) {
            return { letter: null, showCrisisPrompt: false, blocked: true };
        }
    }
    if (userInput && (0, crisisKeywords_1.containsCrisisContent)(userInput)) {
        return { letter: null, showCrisisPrompt: true };
    }
    try {
        await (0, rateLimit_1.checkRateLimit)(request.auth.uid);
    }
    catch (err) {
        if (err instanceof Error && err.message === 'RATE_LIMIT_EXCEEDED') {
            throw new https_1.HttpsError('resource-exhausted', 'Letter limit reached — try again in an hour.');
        }
        // Rate limit storage failure is non-fatal — continue
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return { letter: (0, mockLetters_1.getRandomMockLetter)(emotionId), showCrisisPrompt: false };
    }
    const client = new sdk_1.default({ apiKey });
    try {
        const prompt = (0, prompt_1.buildPrompt)({
            emotionId,
            verseBody,
            reference,
            userInput: (userInput === null || userInput === void 0 ? void 0 : userInput.trim()) || undefined,
            userName: (userName === null || userName === void 0 ? void 0 : userName.trim()) || 'friend',
            hourOfDay,
            faithBackground: faithBackground,
            primaryIntent: primaryIntent,
            lifeStage: lifeStage,
        });
        console.log('[generateLetter] prompt fingerprint', {
            openingAngle: prompt.user.slice(prompt.user.indexOf('\n\n') + 2, prompt.user.indexOf('\n\n') + 2 + 80).replace(/\n/g, ' '),
            userMessageLength: prompt.user.length,
            systemMessageLength: prompt.system.length,
        });
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 600,
            temperature: 1.0,
            system: prompt.system,
            messages: [{ role: 'user', content: prompt.user }],
        });
        const letterContent = response.content[0];
        if (letterContent.type !== 'text') {
            throw new https_1.HttpsError('internal', 'Unexpected response format');
        }
        console.log('[generateLetter] claude response', {
            stopReason: response.stop_reason,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            letterLength: letterContent.text.length,
            letterFirstLine: letterContent.text.slice(0, 80).replace(/\n/g, ' '),
        });
        return { letter: letterContent.text, showCrisisPrompt: false };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('internal', 'Failed to generate letter');
    }
});
//# sourceMappingURL=generateLetter.js.map