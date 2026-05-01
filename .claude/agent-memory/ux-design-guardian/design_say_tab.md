---
name: Say tab — design conventions
description: Design grammar for the "Say" persistent chat tab — non-bubble two-voice journal pattern, memory UX rules, thinking-state pattern
type: project
---

The "Say" tab is a persistent chat-like space where the user types freely and an AI responds with warm, grounding tone, with persistent server-side memory.

**Why:** Designed 2026-04-30 as a complement to the envelope/verse/letter flow. Must NOT feel like a chat product (no iMessage bubbles, no ChatGPT cards). The metaphor is a "quiet room" / "two-voice journal."

**How to apply:**
- Tab label "Say", icon is a single Lora italic open-quotation glyph `"` in amber 22px. Never a chat bubble or microphone icon.
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
