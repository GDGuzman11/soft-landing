# Security Policy & Hardening Report — Soft Landing

_Last reviewed: 2026-10-21 (pre-TestFlight hardening pass, V1.10). Verified against live code._

## Executive Summary

Soft Landing's security posture is **strong for its pre-launch stage**. Secrets
are handled correctly (server secret in Firebase Secret Manager; client config
is public-by-design and gitignored), every callable Cloud Function enforces
Firebase Auth, Firestore rules are deny-by-default with owner-scoped access, and
user input reaching Claude passes through a genuinely multi-layer injection /
obfuscation / crisis pipeline with output canary-leak checks.

The remaining material work is **feature-level, not vulnerability-level**:
server-side premium gating and RevenueCat entitlement sync are not yet wired
(premium is hardcoded off), and the `generateLetter` Cloud Run service is
flagged as publicly invokable. These are tracked below as **pre-launch
recommendations**, not defects introduced by this review. No code behavior was
changed in this pass; the only edit was completing `app-frontend/.env.example`.

## What's Already Done Right (verified)

- **Server secret isolation** — `ANTHROPIC_API_KEY` is declared via
  `secrets: ['ANTHROPIC_API_KEY']` on each `onCall` (e.g.
  `app-backend/functions/src/say/generateSayResponse.ts:128`) and read from
  `process.env` at runtime only. It never appears in client code or config.
- **No secrets in git** — verified `git ls-files` tracks no `.env`,
  `service-account-key.json`, `GoogleService-Info.plist`, `*.p8`, or
  `google-services.json`. `git check-ignore` confirms `app-frontend/.env`,
  `app-backend/functions/.env`, and `scripts/service-account-key.json` are all
  ignored.
- **Auth on every callable** — `generateLetter`, `generateThroughLine`,
  `generateSayResponse`, `startSayChat`, `maybeDeliverReachOut`, and
  `deleteUserData` all reject when `request.auth` is absent
  (`HttpsError('unauthenticated')`).
- **Deny-by-default Firestore rules** (`app-backend/firestore.rules`) — user
  paths (`letterUsage`, `sayUsage`, `sayState`, `sayChatCreation`, `pushTokens`,
  and `say/{uid}/{personaId}/{chatId}` + nested `messages`) are scoped to
  `request.auth.uid == owner`. `verses` is read-only; all `say/*` writes are
  server-only (`allow write: if false`, Admin SDK only); `deletionAudit` and
  `sayReachOutDelivery` are fully server-only; a catch-all `{document=**}` denies
  everything else.
- **Multi-layer input pipeline** before any text reaches Claude:
  1. Schema validation (type, non-empty, length cap — e.g. 2000-char message
     cap in `generateSayResponse.ts`).
  2. Obfuscation normalization (`textNormalizer.ts`) — zero-width chars,
     Cyrillic/Greek homoglyphs, deliberate letter-spacing, full leet-speak map,
     plus base64 and ROT13 decoding.
  3. Injection filtering (`inputFilter.ts`) — SQL, NoSQL, an extensive
     prompt-injection / jailbreak / role-hijack / system-tag / fictional-wrapper
     ruleset, code injection, and path traversal; encoded-payload detection runs
     on decoded forms.
  4. Crisis detection (`crisisKeywords.ts`) — conservative keyword list matched
     against normalized forms; on hit the function returns a crisis prompt and
     **never** generates. Runs server-side.
- **Cross-turn jailbreak defense** — Say concatenates recent user messages
  *across all of a persona's chats* and re-filters, so a payload split over
  turns or separate chats can't slip through (`generateSayResponse.ts:188`).
- **Output safety** — responses are length-truncated to a sentence boundary and
  checked for the buried `SAY_CANARY` marker; a leak is replaced with a safe
  fallback (`generateSayResponse.ts:308`).
- **Server-side rate limiting** via Firestore transactions:
  - Letters: 20 / rolling hour (`rateLimit.ts`).
  - Say messages: 100/day free, 500/day premium, 20/60s burst
    (`say/sayRateLimit.ts`).
  - Say chat creation: 30/day, 5/60s burst (`say/sayChatCreationLimit.ts`).
  All increments happen inside the transaction, so concurrent calls can't race
  past the cap.

## Verified-Clean: Secrets & Gitignore

No secret values are committed. All sensitive artifacts are gitignored and
untracked (checked 2026-10-21). `app-frontend/.env.example` contains only
placeholder values and documents every `EXPO_PUBLIC_*` the app reads. All
`EXPO_PUBLIC_*` values are public-by-design client identifiers; the only true
secret (`ANTHROPIC_API_KEY`) lives in Firebase Secret Manager.

## Prioritized Recommendations

These are recommendations, not changes made in this pass. Items marked
**pre-launch** should be resolved before public App Store release.

| # | Item | Risk if unaddressed | Pre-launch? | Note |
|---|------|--------------------|:-----------:|------|
| 1 | **Server-side premium gating** — `generateSayResponse.ts:218` hardcodes `const isPremium = false`; `generateLetter` has no entitlement check. All users get the free tier regardless of purchase. | Paid users throttled as free; no server enforcement of paid limits. | **Yes** | BUG-010 / BUG-026. Must verify the RevenueCat entitlement server-side (webhook or REST) and pass the real `isPremium` into `checkSayRateLimit`. |
| 2 | **RevenueCat entitlement sync not wired** — `app-frontend/src/services/purchases.ts` only calls `Purchases.configure`; no `addCustomerInfoUpdateListener`, no push of active entitlement into local state. Client tier can drift from the true RC entitlement. | Premium features gated on stale/forgeable local tier; entitlement never reaches the server for enforcement. | **Yes** | BUG-026. Local cache must be treated as UX only; server-side RC check (item 1) is the real gate. Fail **closed** (deny premium) when RC is unreachable. |
| 3 | **`generateLetter` Cloud Run service publicly invokable** — deployed with public invoker. | Unauthenticated/abusive direct invocation of the function (cost, LLM abuse) bypassing the app. | **Yes** | Lock the Cloud Run service to authenticated invocation before public release. Project-note-tracked. Pairs well with enabling Firebase App Check. |
| 4 | **Re-enable client check-in / letter gates** — the free-tier daily check-in limit and `canUseLetter` gate are disabled for testing. | Free tier unbounded client-side (server rate limits still apply as backstop). | **Yes** | BUG-014. Client gate is UX; server rate limit is the security backstop and remains active. |
| 5 | **Observability for swallowed rate-limit failures** — if the Firestore transaction in `rateLimit.ts` / `sayRateLimit.ts` throws (e.g. Firestore outage), the caller logs and **continues** (fails open on the limiter). This is a deliberate availability trade-off but is currently only `console.error`-logged. | A silent Firestore degradation would quietly disable rate limiting with no alert. | No | Zero-risk, behavior-neutral: the `console.error` calls already exist at `generateSayResponse.ts:229` (`say.rate_limit_storage_failed`). `rateLimit.ts` has **no** try/catch around `checkRateLimit` in the limiter itself — the swallow happens in the *caller* (`generateLetter`); add a `console.warn('letter.rate_limit_storage_failed', ...)` there and a matching one in the `generateLetter` catch so both silent-failure paths are observable/alertable. **Backend-owned — route to backend-engineer; do not edit here.** |
| 6 | **Enable Firebase App Check** for Cloud Functions. | Reduces automated/off-device abuse of callables. | No | Complements item 3. Defense-in-depth. |
| 7 | **Restrict client API keys by bundle id / referrer** in Google Cloud Console (iOS key → `com.appsoftlanding.com`). | Public client keys reusable outside the app. | No | Keys are public by design, but scoping limits misuse. |
| 8 | **Rotate any Firebase credentials** that ever touched git history before launch, and set a Google Cloud billing alert. | Historical credential exposure; runaway cost on abuse. | **Yes** | Hygiene; pairs with items 1–3. |

## Ongoing Maintenance

- **Keep the injection ruleset current** (`inputFilter.ts`) — new jailbreak
  phrasings appear constantly. Review quarterly and after any Claude model/API
  change. The encoded-payload (`base64`/ROT13) and homoglyph maps in
  `textNormalizer.ts` should grow as new evasion forms are observed.
- **Keep the crisis keyword list current** (`crisisKeywords.ts`) — additions are
  encouraged and cheap. **Never remove a phrase** without written justification
  (why removed, who approved, what covers the gap). The list is matched against
  normalized forms, so coded/obfuscated variants are caught too.
- **Audit `react-native-purchases`** and run `pnpm audit` / `npm audit` before
  every release; critical/high CVEs block release.

## Data Classification

| Data | Classification | Storage | Leaves Device |
|---|---|---|---|
| Emotion selections | Sensitive | AsyncStorage | No |
| Check-in history | Sensitive | AsyncStorage | No |
| Saved messages + letters | Sensitive | AsyncStorage | No |
| Prayer / "what's on your heart" input | Sensitive | Ephemeral | Yes — sent to Cloud Function, discarded after response |
| Say chat messages | Sensitive | Firestore (owner-scoped) | Yes — stored server-side per owner |
| App settings | Non-sensitive | AsyncStorage | No |
| Subscription state cache | Financial | AsyncStorage | No (UX cache only) |
| RevenueCat receipts | Financial | RevenueCat SDK | Yes — RC servers only |

**AI pipeline note:** letter-compose input is sent to `generateLetter`, passed
to Claude, and discarded (not logged or stored). Say messages are persisted in
Firestore under the owning user for conversation memory. Users are informed via
in-app disclosure.

## Storage & Notification Rules

- **AsyncStorage** is unencrypted on-device; acceptable for current local-first
  scope. If cloud sync is added, encrypt mood data in transit and at rest.
- **expo-secure-store** reserved for any future hardware-backed token/entitlement
  cache.
- **Notification payloads** must never contain mood data or message body text —
  only app name, generic prompt text, and routing metadata.

## Firestore Security Rules (current)

Deny-by-default; all app paths owner-scoped, all `say/*` writes server-only.
Authoritative source: `app-backend/firestore.rules`. Collections covered:
`letterUsage`, `verses` (read-only), `say/{uid}/{personaId}/{chatId}` + nested
`messages`, `sayUsage`, `sayState`, `sayChatCreation`, `sayReachOutDelivery`
(server-only), `pushTokens`, `deletionAudit` (server-only), and a catch-all
deny. (Earlier versions of this doc showed a letterUsage-only rule set — that was
stale; the live rules are broader.)

## Reporting a Vulnerability

Open a private GitHub Security Advisory at:
https://github.com/GDGuzman11/soft-landing/security/advisories/new
