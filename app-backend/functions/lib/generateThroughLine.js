"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateThroughLine = void 0;
const https_1 = require("firebase-functions/v2/https");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const MONTH_RE = /^\d{4}-\d{2}$/;
const VALID_EMOTIONS = new Set(['stressed', 'tired', 'sad', 'neutral', 'good']);
function validate(data) {
    if (!data.month || !MONTH_RE.test(data.month)) {
        throw new https_1.HttpsError('invalid-argument', 'month must be YYYY-MM');
    }
    if (!Array.isArray(data.checkIns) || data.checkIns.length < 3) {
        throw new https_1.HttpsError('invalid-argument', 'At least 3 check-ins required');
    }
    if (data.checkIns.length > 62) {
        throw new https_1.HttpsError('invalid-argument', 'Too many check-ins');
    }
    for (const c of data.checkIns) {
        if (typeof c.date !== 'string' || c.date.length !== 10) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid check-in date');
        }
        if (!VALID_EMOTIONS.has(c.emotionId)) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid emotionId in check-ins');
        }
    }
    if (!Array.isArray(data.verses) || data.verses.length === 0 || data.verses.length > 20) {
        throw new https_1.HttpsError('invalid-argument', 'verses must be 1–20 items');
    }
    for (const v of data.verses) {
        if (typeof v.body !== 'string' || v.body.length > 600) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid verse body');
        }
        if (typeof v.reference !== 'string' || v.reference.length > 100) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid verse reference');
        }
    }
    if (data.letterSnippets !== undefined) {
        if (!Array.isArray(data.letterSnippets) || data.letterSnippets.length > 5) {
            throw new https_1.HttpsError('invalid-argument', 'letterSnippets must be ≤5 items');
        }
        for (const s of data.letterSnippets) {
            if (typeof s !== 'string' || s.length > 200) {
                throw new https_1.HttpsError('invalid-argument', 'Invalid letter snippet');
            }
        }
    }
}
function buildSystemPrompt() {
    return `You write single editorial sentences that distill a person's emotional month into one quiet, resonant line. The sentence should feel like something you would find written in the margin of a journal — honest, warm, not preachy. It captures an arc or a turning point without naming it too literally.

Rules:
- Exactly one sentence, 8–18 words.
- No em dash. No surrounding quotation marks.
- Vary your opening — do not always start with "You" or "This".
- No religious jargon or clichés.
- Write in second person ("you") unless a different structure fits better.
- The sentence becomes a permanent title for this month, so it should stand on its own.`;
}
function buildUserPrompt(data) {
    const emotionCounts = {};
    for (const c of data.checkIns) {
        emotionCounts[c.emotionId] = (emotionCounts[c.emotionId] ?? 0) + 1;
    }
    const emotionSummary = Object.entries(emotionCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([e, n]) => `${e}: ${n} day${n > 1 ? 's' : ''}`)
        .join(', ');
    const verseLines = data.verses
        .slice(0, 5)
        .map(v => `- "${v.body.slice(0, 120)}" (${v.reference})`)
        .join('\n');
    let snippetBlock = '';
    if (data.letterSnippets && data.letterSnippets.length > 0) {
        snippetBlock = `\nLines from their letters this month:\n${data.letterSnippets.map(s => `- ${s}`).join('\n')}`;
    }
    return `Month: ${data.month}
Check-ins: ${data.checkIns.length} total — ${emotionSummary}

Verses that found them:
${verseLines}${snippetBlock}

Write the through-line sentence for this month.`;
}
exports.generateThroughLine = (0, https_1.onCall)({ region: 'us-central1', invoker: 'public', secrets: ['ANTHROPIC_API_KEY'] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to generate a through-line.');
    }
    const data = request.data;
    validate(data);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new https_1.HttpsError('internal', 'Service not configured');
    }
    const client = new sdk_1.default({ apiKey });
    try {
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 80,
            temperature: 1.0,
            system: buildSystemPrompt(),
            messages: [{ role: 'user', content: buildUserPrompt(data) }],
        });
        const content = response.content[0];
        if (content.type !== 'text') {
            throw new https_1.HttpsError('internal', 'Unexpected response format');
        }
        const line = content.text.trim().replace(/^["']|["']$/g, '');
        return { line };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('internal', 'Failed to generate through-line');
    }
});
//# sourceMappingURL=generateThroughLine.js.map