---
name: say-start-chat
description: startSayChat callable — prior-day check-up opener flow, cost guards, and index strategy
metadata:
  type: project
---

`startSayChat` (`app-backend/functions/src/say/startSayChat.ts`, exported from index.ts) creates a new chat and optionally seeds a gentle prior-day check-up opener. Input `{ personaId, userName?, clientDay 'YYYY-MM-DD', prevDayStartMs, prevDayEndMs }` (prev-day bounds are UTC epoch-ms of the user's PREVIOUS LOCAL day, computed client-side).

Key decisions / **Why:**
- Does NOT call `checkSayRateLimit` — it is assistant-initiated and must not consume the user's 100/day cap. Cost is bounded instead by the once-per-persona-per-local-day guard in `sayState/{uid}`.
- Fails SAFE on cost: if the `sayState` guard read fails, it skips the opener (never risks a duplicate). Any summary/opener/Claude failure degrades gracefully to a plain empty chat `{ chatId }`.
- Prior-day gather is index-light: lists the persona's chat docs, then per-chat runs a single-field `createdAt >=/< ` range query on that chat's own `messages` subcollection (auto single-field index). **No composite index required.** Only user/assistant roles are summarized (reachOut openers excluded), merged chronologically, capped at 60.
- Two Claude calls, both `claude-sonnet-4-6`: summary (max_tokens 120 → stored as `daySummary` on chat doc) then opener (max_tokens 200, system = `getSaySystemPrompt`). Opener stored as the chat's FIRST message with `role:'reachOut'` (mirrors deliverReachOutForUser).

**How to apply:** If the per-chat range query ever gets combined with another filter/order, that WOULD need a composite index — flag it. Every stored message string fed to the summarizer is sanitized (strip `<>`, control chars, `${`) via a local `sanitizeMessageText`; keep that if touching the summarization input.
