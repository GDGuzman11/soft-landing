# Launch Checklist — Soft Landing

**Model: Free-first.** V1 ships **free** (no subscriptions); RevenueCat/paid lands in **V1.1** as a fast-follow.
Two lanes: **ENG** (code/deploy — Claude can do most) and **BIZ** (your accounts, dashboards, counsel).

Legend: ☐ todo · ◐ in progress · ☑ done · ⚠️ deadline

_Sources: `docs/bugs.json`, `docs/SECURITY.md`, `docs/LEGAL-REVIEW.md`, memory pre-launch security checklist._

---

## Tier 0 — This week (hard deadline + backend; ships without Apple review)

**ENG**
- ☑ **Node 22 runtime bump** (`app-backend/functions/package.json` engines → 22) — ⚠️ **DEPLOY before Oct 30, 2026** (Node 20 decommission). Deploy: `cd app-backend && firebase deploy --only functions`.
- ☐ **Deploy + test account deletion** (`deleteUserData`) end-to-end — **Apple requires** in-app account deletion. Code + Settings wiring exist; confirm it's deployed and actually wipes Firestore + Auth on a test account.
- ☑ **Cloud Run "lockdown"** — **RESOLVED, no action.** `invoker:'public'` is *required* for Firebase callable functions; auth is enforced in-code via `request.auth`. Do NOT remove it (would break the app). Prior "open Cloud Run" flag was a misunderstanding.

---

## Tier 1 — Launch blockers (free-first)

**ENG**
- ☐ **Neutralize the paywall for V1** — hide/remove subscription entry points (`app/paywall.tsx` + any "upgrade" CTAs) and **unlock premium features for everyone in V1** (premium verses, all Say personas), so Apple never sees non-functional IAP and free users aren't blocked. Re-gate in V1.1.
- ☐ **UGC report/block mechanism** — in-app "report" on AI messages + a block/mute path, wired to a moderation handling flow (**Apple Guideline 1.2** for AI chat + user content). Published policy already in Terms §10.
- ☐ **Re-enable the daily check-in limit** (BUG-014) — now primarily for **API cost control** (not upsell). Confirm the number is sane.
- ☐ **Verify** `ANTHROPIC_API_KEY` secret is set and rate limits are appropriate (`rateLimit.ts`, `sayRateLimit.ts`).

**BIZ**
- ☐ **App Store Connect**: app record, listing copy, screenshots (free app).
- ☐ **Privacy "nutrition" label** matching the rewritten `privacy-policy.html` (data types + processors).
- ☐ **Age rating** set to match the 16+ gate (likely 17+ for AI chat).
- ☐ **Attorney review** of Terms + Privacy Policy + moderation section (required).
- ☐ **Confirm image provenance/licenses** — the **[CONFIRM]** entries in `NOTICE.md`.

---

## Tier 2 — Before / around TestFlight (strategic)

**ENG**
- ☐ **EAS Update (expo-updates) setup** — OTA so post-launch JS/copy/legal-link fixes ship without a rebuild. ~1-time config: `runtimeVersion` policy + channels mapped to `preview`/`production`.
- ☐ **iOS API key restriction** (Cloud Console → Credentials → restrict the iOS key to `com.appsoftlanding.com`) — after TestFlight confirms working.
- ☐ **Firebase App Check** — register production bundle id, enable enforcement on callable functions (DeviceCheck/App Attest).
- ☐ (Optional) **Close age-gate residual** — social sign-in started from the Sign-In screen can create an account without the gate; move the gate to first launch to fully close.

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
