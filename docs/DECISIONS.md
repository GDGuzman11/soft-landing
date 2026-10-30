# Architectural Decisions

A running log of load-bearing technical decisions, with rationale and what we gave up to get there. Each entry is dated and frozen — if a decision is reversed, add a new entry rather than editing the old one.

---

## ADR-001: Expo managed workflow over bare React Native
**Date:** 2026-04-17
**Status:** Accepted

**Decision.** Use Expo's managed workflow for V1.

**Rationale.** Faster iteration cycle (OTA updates, no Xcode/Gradle babysitting), built-in handling for permissions (notifications, IAP), and a single config file (`app.json`) instead of two native projects. The managed workflow now supports every native module we need via config plugins — RevenueCat, Reanimated, AsyncStorage, expo-notifications.

**Tradeoffs.** Cannot drop in arbitrary native code without ejecting. We accept this; if we hit a wall in V2 we can switch to the prebuild workflow without rewriting JS.

---

## ADR-002: React Native Reanimated over Lottie
**Date:** 2026-04-17
**Status:** Accepted

**Decision.** All envelope flight, card transitions, and reveal animations use Reanimated v3 worklets.

**Rationale.** Reanimated runs on the UI thread — no JS-bridge jank when the user is mid-tap. We also avoid bundling animation binary assets, which would bloat the IPA/APK and require an After Effects pipeline to update. The envelope motion is simple physics (curve + scale + rotate); writing it in Reanimated is a few dozen lines.

**Tradeoffs.** Designers cannot author animations in After Effects and hand off `.json` files. For Soft Landing's restrained aesthetic this is fine — animations are minimal and motion design lives in code review.

---

## ADR-003: Local-first storage, no backend in V1
**Date:** 2026-04-17
**Status:** Accepted

**Decision.** Ship V1 with no server. All check-in history, streaks, and preferences live in AsyncStorage on the device.

**Rationale.** Zero infrastructure to operate, monitor, or breach. No accounts means no signup friction — the user can check in within seconds of installing. Emotion data is sensitive; keeping it on-device sidesteps an entire category of privacy concerns. This also lets us ship the MVP in weeks instead of months.

**Tradeoffs.** No cross-device sync, no aggregate analytics, no remote message library updates without an app release. We will revisit in V2 with opt-in encrypted sync; the storage adapter interface is designed to make that swap painless (see ARCHITECTURE.md).

---

## ADR-004: NativeWind v4 for styling
**Date:** 2026-04-17
**Status:** Accepted

**Decision.** Use NativeWind v4 (Tailwind for React Native) for all component styling. Define design tokens (the warm palette, emotion colors, type scale) in `tailwind.config.js`.

**Rationale.** A single source of truth for design tokens that's accessible from every component. Tailwind familiarity for any contributor with web experience. v4's compiler resolves classes at build time, so runtime cost is negligible. Avoids `StyleSheet.create` boilerplate and inline-style sprawl.

**Tradeoffs.** One more build-time dependency, and a learning curve for contributors who haven't used Tailwind. We consider this a small price for design-token consistency across the app.

---

## ADR-005: RevenueCat for subscriptions over hand-rolled IAP
**Date:** 2026-04-17
**Status:** Accepted

**Decision.** Use RevenueCat as the subscription layer. Both monthly ($5.99) and annual ($47.99) products flow through RevenueCat entitlements.

**Rationale.** Cross-platform (one API for App Store and Play Store), server-side receipt validation (we do not have a server), built-in handling for refunds, grace periods, billing retries, and family sharing. Building any one of those correctly takes weeks; getting all of them right is a full subteam.

**Tradeoffs.** External dependency on a third party that takes a percentage of revenue. RevenueCat's free tier covers us comfortably until we are well past breakeven, and the percentage is small relative to engineering cost saved.

---

## ADR-006: Maestro over Detox for end-to-end tests
**Date:** 2026-04-17
**Status:** Accepted

**Decision.** Use Maestro for end-to-end flows. Vitest covers unit and integration tests.

**Rationale.** Maestro flows are YAML — readable by anyone, no test code to maintain. It works on Windows (the team's primary dev OS), where Detox setup is famously painful. Maestro's wait-for-element model is more forgiving of animation timing, which matters for an app whose core interaction is a Reanimated envelope flight.

**Tradeoffs.** Maestro is younger than Detox and has a smaller assertion vocabulary. For Soft Landing's flows (pick emotion → tap envelope → see message → check streak) it is more than sufficient.

---

## ADR-007: DM Sans + Lora font pairing
**Date:** 2026-04-17
**Status:** Accepted

**Decision.** **DM Sans** for all UI chrome (buttons, labels, navigation, settings). **Lora** for the validating message in the reveal screen.

**Rationale.** DM Sans is geometric, neutral, and renders crisply at small sizes — ideal for buttons and metadata. Lora is a contemporary serif with warm humanist proportions; it makes the message feel like it was written by a person, not generated. The contrast between sans UI and serif content reinforces that the message is the content and everything else is scaffolding.

**Tradeoffs.** Two font families add ~100KB to bundle size. For a single-purpose emotional app, the typographic intent is core to the product, not decoration.

---

## ADR-008: Vertical card stack for emotion picker
**Date:** 2026-04-17
**Status:** Superseded by ADR-009

**Decision.** The emotion picker is a vertical stack of full-width cards (one per emotion), not a 2-column or 3-column grid.

**Rationale.** Picking how you feel is the entire interaction. A grid of small tiles encourages a hurried, almost gamified tap. A vertical stack with breathing room between cards slows the user down — they read each label, feel which one matches, and choose deliberately. The deliberate pace is the product.

**Tradeoffs.** Requires a scroll on smaller devices (5 emotions ~= one screen on most phones). We prefer the slight scroll over a cramped grid; if real usage shows the scroll is friction, we will revisit.

---

## ADR-009: Single-card swipe for emotion picker (replaces ADR-008)
**Date:** 2026-04-30
**Status:** Accepted

**Decision.** Replace the vertical card list with one full-bleed card that fills most of the screen. The user swipes left or right to cycle emotions; tapping the card selects it.

**Rationale.** The vertical list had a noticeable render lag (multi-card stack, multiple simultaneous `withRepeat` animations) and the stacked design felt visually noisy. One card at a time is calmer and more intentional — still deliberate, but now immersive. The full-bleed biblical illustration gives each emotion a distinct visual identity that words and colour alone couldn't. Performance gains from rendering a single card and pre-loading all 5 images on mount make swapping instantaneous.

**Tradeoffs.** The user can't see all 5 options at a glance (they must swipe). Pagination dots and the emotion label above the card address discoverability. The tradeoff is accepted: the tactile engagement of swiping through images reinforces the reflective mood the app is trying to create.

---

## ADR-010: Say — discrete chats per persona (not per emotion)
**Date:** 2026-10-20
**Status:** Accepted

**Decision.** Keep the four voice personas (Kind / Still / Steady / Wise) as the chat entities, and give each persona multiple **discrete chat sessions** rather than one continuous stream. Chats are stored at `say/{uid}/{personaId}/{chatId}` with messages in a `messages` subcollection; `generateSayResponse` scopes to a `chatId`.

**Rationale.** The request was framed around "emotions," but the chat system is built on personas and the five check-in emotions are a separate, parallel feature; wiring emotions into chat would have been a much larger re-architecture for no clear user benefit. Discrete sessions let a person keep distinct conversations with the same voice and get a fresh, context-aware opener each time.

**Tradeoffs.** A new session/schema layer and a nav restructure (persona → chat-list → thread). The legacy flat message stream is not migrated (no production users yet). Firestore path arity forced chat docs to live directly in the persona collection (no literal `chats/` segment); the chat-list query orders by `lastMessageAt`, which also excludes any stray legacy/reach-out docs.

---

## ADR-011: Device-local day boundary for streaks and daily limits
**Date:** 2026-10-20
**Status:** Accepted

**Decision.** Compute "what day is it for the user" with a single `localDayKey()` helper (device-local `YYYY-MM-DD`) instead of `toISOString().slice(0,10)` (UTC).

**Rationale.** UTC bucketing rolled the day at the wrong local clock time for users behind UTC — streaks and the daily check-in count appeared to reset early or on re-login. Local bucketing matches the user's lived "day." (Plain sign-out never wiped data; the earlier data-wipe theory was wrong — only the explicit Delete/Start-over actions clear storage.)

**Tradeoffs.** Stored check-in timestamps remain UTC ISO strings; the local day is derived from them at read time, so a device whose timezone changes will re-bucket history to the new zone. Acceptable for a personal, single-device app (ADR-003).

---

## ADR-012: Expo SDK 57 upgrade
**Date:** 2026-10-20
**Status:** Accepted

**Decision.** Upgrade `app-frontend` from Expo SDK 54 to 57 (incrementally, 54 → 55 → 56 → 57), letting `expo install --fix` set compatible versions at each hop.

**Rationale.** Expo Go on devices had moved to SDK 57, so the SDK-54 project no longer loaded in Expo Go — and iOS can't install an older Expo Go. Upgrading restores on-device testing and keeps the dependency tree current (RN 0.86, React 19.2, Reanimated 4.5, TypeScript 6.0).

**Tradeoffs.** Three SDK jumps at once; required `app.json` schema changes (`newArchEnabled`/`splash`) and minor RN 0.86 type fixes. Native modules (RevenueCat, view-shot, Apple sign-in) still require a development build — Expo Go covers the core flow only. The functions runtime remains Node 20, which Google decommissions 2026-10-30 (tracked separately — bump to Node 22).
