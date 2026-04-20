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
const mockLetters_1 = require("./mockLetters");
exports.generateLetter = (0, https_1.onCall)({ region: 'us-central1', invoker: 'public' }, async (request) => {
    // Firebase onCall v2 auto-verifies Firebase Auth JWT
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to write a letter.');
    }
    const data = request.data;
    const { emotionId, verseBody, reference, userInput, userName } = data;
    // Input validation
    if (!verseBody || typeof verseBody !== 'string' || verseBody.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'verseBody is required');
    }
    if (!emotionId || !['stressed', 'tired', 'sad', 'neutral', 'good'].includes(emotionId)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid emotionId is required');
    }
    if (userInput !== undefined && userInput.length > 1000) {
        throw new https_1.HttpsError('invalid-argument', 'Message too long — keep it under 1000 characters');
    }
    // Crisis detection — surface resources instead of generating a letter
    // userInput is never logged for privacy
    if (userInput && (0, crisisKeywords_1.containsCrisisContent)(userInput)) {
        return { letter: null, showCrisisPrompt: true };
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return { letter: (0, mockLetters_1.getRandomMockLetter)(emotionId), showCrisisPrompt: false };
    }
    const client = new sdk_1.default({ apiKey });
    try {
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 400,
            messages: [
                {
                    role: 'user',
                    content: (0, prompt_1.buildPrompt)({
                        emotionId,
                        verseBody,
                        reference,
                        userInput: (userInput === null || userInput === void 0 ? void 0 : userInput.trim()) || undefined,
                        userName: (userName === null || userName === void 0 ? void 0 : userName.trim()) || 'friend',
                    }),
                },
            ],
        });
        const letterContent = response.content[0];
        if (letterContent.type !== 'text') {
            throw new https_1.HttpsError('internal', 'Unexpected response format');
        }
        return { letter: letterContent.text, showCrisisPrompt: false };
    }
    catch (err) {
        // Re-throw HttpsErrors as-is
        if (err instanceof https_1.HttpsError)
            throw err;
        // Wrap unexpected errors
        throw new https_1.HttpsError('internal', 'Failed to generate letter');
    }
});
//# sourceMappingURL=generateLetter.js.map