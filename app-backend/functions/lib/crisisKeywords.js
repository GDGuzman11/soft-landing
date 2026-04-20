"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRISIS_KEYWORDS = void 0;
exports.containsCrisisContent = containsCrisisContent;
// High-risk phrases that trigger the crisis resource screen instead of letter generation.
// The letter is never generated when these are detected — the app surfaces resources instead.
// This list is deliberately conservative. Add phrases but never remove without review.
exports.CRISIS_KEYWORDS = [
    'kill myself',
    'killing myself',
    'end my life',
    'end it all',
    'want to die',
    'wanting to die',
    'rather be dead',
    'suicide',
    'suicidal',
    'self harm',
    'self-harm',
    'hurt myself',
    'hurting myself',
    'cut myself',
    'no reason to live',
    'not worth living',
    'life is not worth',
    'life isn\'t worth',
];
function containsCrisisContent(text) {
    const lower = text.toLowerCase();
    return exports.CRISIS_KEYWORDS.some((phrase) => lower.includes(phrase));
}
//# sourceMappingURL=crisisKeywords.js.map