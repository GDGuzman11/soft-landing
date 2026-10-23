# Launch Checklist — Soft Landing

**Model: Free-first.** V1 ships **free** (no subscriptions); RevenueCat/paid lands in **V1.1** as a fast-follow.
Two lanes: **ENG** (code/deploy — Claude can do most) and **BIZ** (your accounts, dashboards, counsel).

Legend: ☐ todo · ◐ in progress · ☑ done · ⚠️ deadline

_Sources: `docs/bugs.json`, `docs/SECURITY.md`, `docs/LEGAL-REVIEW.md`, memory pre-launch security checklist._

---

## Tier 0 — This week (hard deadline + backend; ships without Apple review)

**ENG**
- ☑ **Node 22 runtime bump** — **DEPLOYED 2026-10-21** ✅. Functions run Node 22; the Oct 30 Node 20 decommission risk is cleared.
- ☑ **Account deletion** (`deleteUserData`) — **deployed + verified 2026-10-21** (throwaway email account created and deleted on command; user removed from Firebase Auth). Apple requirement satisfied.
- ☑ **Cloud Run "lockdown"** — **RESOLVED, no action.** `invoker:'public'` is *required* for Firebase callable functions; auth is enforced in-code via `request.auth`. Do NOT remove it (would break the app). Prior "open Cloud Run" flag was a misunderstanding.

---

## Tier 1 — Launch blockers (free-first)

**ENG**
- ☑ **Neutralize the paywall for V1** — `V1_UNLOCK_ALL=true` unlocks premium verses + all Say personas; paywall is unreachable from the UI. Re-gate in V1.1.
- ☑ **UGC report/block mechanism** — long-press → report on AI messages (`reportSayMessage` callable, **deployed 2026-10-22**) + voice mute/block in Settings. Terms §10 + in-app AI disclosure cover **Apple Guideline 1.2**.
- ⏸ **Daily check-in limit** (BUG-014) — now behind `CHECK_IN_LIMIT_ENABLED` (constants), **deliberately off for TestFlight**. Flip to true + confirm `FREE_CHECKINS_PER_DAY` before the public submission.
- ☑ **Verify** `ANTHROPIC_API_KEY` secret + rate limits — all seven functions boot (nodejs22) and Say/letters work live, confirming the secret mounts; limiters in `rateLimit.ts`/`sayRateLimit.ts`/`sayChatCreationLimit.ts`.

**BIZ**
- ☐ **App Store Connect**: app record, listing copy, screenshots (free app).
- ☐ **Privacy "nutrition" label** matching the rewritten `privacy-policy.html` (data types + processors).
- ☐ **Age rating** set to match the 16+ gate (likely 17+ for AI chat).
- ☐ **Attorney review** of Terms + Privacy Policy + moderation section (required).
- ☐ **Confirm image provenance/licenses** — the **[CONFIRM]** entries in `NOTICE.md`.

---

## Tier 2 — Before / around TestFlight (strategic)

**ENG**
- ☑ **EAS Update (expo-updates)** — configured; `runtimeVersion` on `appVersion` policy + per-profile channels. **`production` build env fixed 2026-10-22** (was missing Firebase/Google vars → would have booted with no backend).
- ☑ **Close age-gate residual** — Sign-In social (Google/Apple) now runs the same 16+ birthdate gate as register, via shared `src/utils/age.ts` (done 2026-10-22).
- ☐ **iOS API key restriction** (Cloud Console → Credentials → restrict the iOS key to `com.appsoftlanding.com`) — after TestFlight confirms working.
- ☐ **Firebase App Check** — register production bundle id, enable enforcement on callable functions (DeviceCheck/App Attest).

---

## Tier 3 — V1.1 / post-launch

**ENG**
- ☐ **RevenueCat**: entitlement sync (client listener → local tier) + **server-side premium check** (replace hardcoded `isPremium=false` in `generateSayResponse.ts`); reintroduce paywall + gating (BUG-010/026).
- ☐ **Self-service data export** (GDPR portability).
- ☐ **Say-message retention limit** (GDPR storage limitation).
- ☐ **Granular consent** (Sentry/reach-outs opt-in).

**BIZ**
- ☐ Create + approve **IAP products** (App Store Connect + RevenueCat) for V1.1.
- ☐ **Execute vendor DPAs/SCCs** (Google, Anthropic, RevenueCat, Sentry); enable Anthropic org data-use controls.
- ☐ **Trademark clearance** for "Soft Landing" before major marketing.

---

## Ship sequence

Tier 0 → Tier 1 → Tier 2 → **TestFlight** (`eas build --profile preview` → test on device) → **App Store submit** (`eas build --profile production` → `eas submit`) → phased release.

## Already done (recent sessions)
Social auth (Google + Apple, native); Expo SDK 57; codebase cleanup; security hardening report; legal docs rewrite (Privacy Policy + Terms accurate, KJV/WEB fix, moderation/CSAM, 16+); NOTICE file; 16+ age gate; Say AI disclosure; Sentry opt-out.

## Readiness audit — 2026-10-22
Full audit vs Apple's App Store Review Guidelines (3 parallel explorers + manual verification).
**Outcome:** backend/security posture solid (owner-scoped Firestore rules, auth on every callable,
input/prompt-injection filters, crisis routing, secrets clean — nothing sensitive is git-tracked).
ENG blockers fixed this pass: production EAS env, Sign-In age-gate residual, support-contact link,
check-in-limit toggle (off for TestFlight), and `reportSayMessage` deployed. Verified all 7 functions
live on nodejs22 → **BUG-033 was stale** (deleteUserData/scheduledReachOut are deployed). Also
**BUG-011 stale** (anti-repetition works via the Firestore selector). Remaining before public launch:
BIZ/legal track below + re-enable the check-in cap. Deferred to V1.1: RevenueCat gating (BUG-010/026),
PII-at-rest (BUG-027), expanded test coverage, App Check, iOS key restriction.
