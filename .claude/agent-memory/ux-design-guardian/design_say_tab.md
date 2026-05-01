---
name: Say tab — design conventions
description: Design grammar for the "Say" tab — lobby (4-voice picker) plus conversation thread (two-voice journal pattern, memory UX, thinking-state)
type: project
---

The "Say" tab is a persistent chat-like space where the user picks one of 4 AI voices (Kind / Still / Steady / Wise) and types freely. Voices respond with warm, grounding tone backed by persistent server-side memory.

**Why:** Designed 2026-04-30 as a complement to the envelope/verse/letter flow. Must NOT feel like a chat product (no iMessage bubbles, no ChatGPT cards). The metaphor is a "quiet room" / "two-voice journal." Lobby spec added 2026-04-30 after a previous flexbox-row card layout shipped broken.

---

## Tab chrome
- Tab label "Say", icon is a single Lora italic open-quotation glyph `"` in amber 22px. Never a chat bubble or microphone icon.

---

## Lobby screen (entry point — picks one of 4 voices)

**The 4 voices and their identity tints (background / border / glyph color):**
- **Kind** ◐ — `#FAF6F0` / `rgba(196,149,106,0.22)` / `#C4956A` — free
- **Still** ◯ — `#F6F4F0` / `rgba(154,143,130,0.22)` / `#9A8F82` — premium
- **Steady** ◑ — `#F4F0EA` / `rgba(125,93,75,0.22)` / `#7D5D4B` — premium
- **Wise** ◕ — `#F2EEE6` / `rgba(108,89,68,0.22)` / `#6C5944` — premium

**Layout rules (bulletproof against the previous bug):**
- VoiceCard is a **single-column vertical stack**. Never `flexDirection: 'row'` with `flex: 1` children — that was the original layout bug. The only allowed row inside a card is the TopRow (glyph left, premium ✦ right) using `justifyContent: 'space-between'` with two fixed-size children, no flex.
- Card surface: `borderRadius: 20`, `borderWidth: 1`, `padding: 22`, `minHeight: 132`. iOS-only subtle shadow; no Android elevation.
- All four cards share the same shape and rhythm — only tint and glyph differentiate. Do NOT vary card heights or add per-voice illustrations/accents.
- Stack gap: 16. Header→first card: 40. Bottom padding: 64.
- Card text is **left-aligned**, never centered (centered reads as a button/ad).

**Time-based greeting (Lora italic 24px, ink primary):**
- 5–11am: "good morning. who's with you today?"
- 11am–5pm: "hey. what's the day asking of you?"
- 5pm–9pm: "long day? pick a door."
- 9pm–5am: "still up. it's okay. someone's here."

**Premium signal:** small amber `✦` (14px) in the card's TopRow only. Never a padlock, "PRO" badge, or the word "Premium" anywhere on the card. Tapping a premium card still navigates into the conversation — the paywall is the conversation screen's concern, not the lobby's.

**First-time-user opening offers (preview slot when no message history, Lora italic, ink muted):**
- Kind: *"come sit. tell me about your day."*
- Still: *"i'm here. no need to fill the room."*
- Steady: *"whatever it is, we'll hold it together."*
- Wise: *"start anywhere. i've got time."*

**Animation:** `withTiming` only — never springs on this screen. Header fades in (700ms ease-out-quad). Cards stagger fade + 12pt translateY (550ms ease-out-cubic, delays 120/220/320/420ms). Press feedback: scale to 0.98 over 180ms. No haptics on lobby — the moment is contemplative.

**Vocabulary ban (whole Say surface):** never use "AI", "bot", "assistant", or "chat" in any UI string. Voices are presences. The action is "say."

---

## Conversation thread (after picking a voice)

- Conversation pattern is **two-voice journal, not bubbles**: user entries are naked DM Sans 17px on the parchment bg; response entries are Lora italic 18px in a soft `rgba(196,149,106,0.05)` card with leading amber `✦` glyph and 28pt left indent. Asymmetry is the point.
- Spacing rhythm in thread: 20pt user→response (intimate pair), 40pt response→next user (breath), 16pt same-speaker consecutive.
- Memory references default to **Pattern A — Soft Recall** (woven into prose, no UI affordance) ~80% of the time. **Pattern B — Echo Marker** (left amber rule + Lora italic quote + "— you, three days ago" attribution) for direct paraphrase. **Pattern C — "What's Held"** screen with theme summaries and per-theme "Let it go" deletion as the privacy escape hatch.
- NEVER show brain/database/thread icons next to recalled content. NEVER show "Memory updated" toasts. NEVER use streak counters or numeric badges.
- Single continuous thread (not dated sessions). Date markers appear inline as `· · · Tuesday · · ·` only when gap > 6h or calendar day changes.
- Thinking state is the **breathing glyph**: 400ms intentional pause after send, then leading `✦` breathes (opacity 1→0.55→1, scale 1→1.08→1, 2400ms cycle) with staggered Lora italic `…`. Response reveals whole, no typewriter/streaming.
- Input is DM Sans 16px (NOT Lora — typing in italic serif feels performative; Lora is reserved for reflection/response). Send affordance is amber `✦` glyph inside the field, right-aligned. Soft 2000 char cap, counter only appears at 1800.
- Failure copy: "Something didn't reach me. Want to send it again?" — never "error" or "failed."
- Entry from envelope/verse flow: delayed soft prompt "Want to say something about this?" appears 1800ms after verse settles on message reveal screen. Carries verse as a silent context card to top of Say thread — do NOT auto-prompt the AI to respond about it.
- Response voice rules: never start with "I", avoid "I hear you", no scripture quoting unless user invites it (Say is distinct from verse flow), never say "as an AI."
