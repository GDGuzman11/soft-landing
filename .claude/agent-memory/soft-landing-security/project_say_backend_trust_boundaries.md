---
name: say-backend-trust-boundaries
description: Trust boundaries, sanitization, crisis routing, and rate-limit gaps in the Say chat backend path (startSayChat + generateSayResponse)
metadata:
  type: project
---

Security map of the Say chat backend (`app-backend/functions/src/say/`). All files owned by the backend-engineer agent, not security — document fixes, do not edit.

**Entry points (both require `request.auth` first):**
- `generateSayResponse.ts` — live chat turn. Pipeline: auth → schema validation → `filterUserInput` (inputFilter.ts) → `containsCrisisContent` (crisisKeywords.ts) returns `showCrisisPrompt` BEFORE any Claude call → multi-turn jailbreak window scan (last 3 user msgs, now scoped per-chatId) → `checkSayRateLimit` (sayRateLimit.ts, 100/day free, 500/day premium, 20/60s burst) → Claude → canary check on output.
- `startSayChat.ts` — NEW prior-day summary + opener. Summarizes user's own prior-day messages via Claude, then generates a `reachOut` opener. Guard: `sayState/{uid}.{personaId}.openingGeneratedForDay === clientDay` (once-per-persona-per-local-day).

**Sanitization before prompts:** `sanitizeMessageText`/`sanitizeFirstName` (startSayChat) and `sanitizeUserText` (prompt.ts) strip `< >`, control chars, `${`. These are LIGHTER than `filterUserInput` — they do NOT catch ChatML/Llama delimiters (`<|im_start|>`, `<<SYS>>`, `[INST]`). Canary `SAY_CANARY` buried in sayPrompt.ts system prompt, leak-checked on all Claude outputs.

**Known gaps flagged in 2026-10-20 read-only review (for backend-engineer to fix):**
- CRITICAL: `startSayChat` is completely unmetered — does NOT call `checkSayRateLimit`. Creates a Firestore chat doc on EVERY call (STEP 3, before the guard at STEP 4) → unbounded doc creation. Once-per-day guard is a non-transactional read-then-write around 2 Claude calls (TOCTOU) and keys on client-controlled `clientDay` string → a hostile client can vary clientDay or fire concurrent calls to bypass it. Fixes: add rate limit at top, move doc creation after guard, make guard transactional + reserve-before-generate, derive/clamp server day.
- MEDIUM (safety): startSayChat runs NO crisis check on prior-day content. A prior-day crisis can be laundered into a cheerful "check-in" opener with no 988/741741 routing. Live path (generateSayResponse) routes crisis correctly; opener path does not. Fix: run `containsCrisisContent` over transcript/summary/opening; skip or use fixed resource-bearing opener on detection.
- MEDIUM: jailbreak-window scan in generateSayResponse is now scoped to a single chatId → payload-splitting across separate chats evades the 3-message window.

**Firestore layout (sayPaths.ts):** chat docs live at `say/{uid}/{personaId}/{chatId}` (the literal `chats` segment collapses into the persona collection due to Firestore path arity); messages at `.../{chatId}/messages/{msgId}`. Roles: 'user' | 'assistant' | 'reachOut'.
