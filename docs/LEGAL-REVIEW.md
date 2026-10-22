# Legal Liability Assessment & Document Checklist — Soft Landing

**Prepared:** 2026-10-21 · **Status:** internal pre-TestFlight review · **Scope:** whole app (frontend, backend, existing policy docs)

> ⚠️ **This is not legal advice.** It was prepared as an engineering/product-counsel-style risk map to hand to a
> licensed attorney. Soft Landing handles emotional, faith, and crisis-adjacent content and takes payments, so an
> actual lawyer must review and finalize every document named here before launch. Nothing below should be relied
> on as a legal opinion.

---

## 1. Executive summary

Soft Landing already has a **genuinely solid legal foundation** — a 20-section Terms of Service and a 16-section
Privacy Policy (`docs/terms.html`, `docs/privacy-policy.html`, both dated 2026-04-20) with limitation of liability,
warranty disclaimer, indemnification, binding arbitration + class-action waiver, California governing law,
Apple/Google auto-renewal disclosures, a strong "NOT a mental health or crisis service" section, and CCPA/GDPR
sections. Most indie apps ship with far less.

**The core problem is drift:** the app added server-side features (the persistent **Say** AI chat, **reach-out**
notifications, **Sentry** crash reporting, **push-token** storage in Firestore) *after* the docs were written, and
the docs were not updated. That turned several accurate statements into **inaccurate** ones. A privacy policy that
affirmatively misstates your data practices is worse than a vague one — it is a misrepresentation (FTC Section 5 /
state UDAP exposure, Apple App Review rejection, GDPR Art. 5(1)(a) accuracy failure).

**The five launch-blocking items:**
1. **Privacy Policy contains false statements** about server-side storage (see Area D) — must be corrected before any public/TestFlight-external release.
2. **Bible attribution is wrong** — Terms claim licensed NIV; the app ships public-domain KJV/WEB (Area I).
3. **No age gate** despite a "13+" representation, on an emotional/crisis-adjacent app (Area F).
4. **UGC + AI chat without a reporting/blocking mechanism** — Apple Guideline 1.2 (Area H).
5. **Say chat never discloses it is AI**, undercutting the "not a therapist/human" posture (Area C).

---

## 2. Method & scope

Read-only review of all user-facing copy, data flows, backend functions, Firestore rules, and the two hosted policy
docs. Findings are grouped into 12 liability areas (A–L), each with: **Risk → Current state (files) → Gap → Document/
clause needed → Priority**. Priorities: **BLOCKER** (fix before external release), **High**, **Med**, **Low**.
Cross-references to `docs/SECURITY.md` and open bugs where relevant.

---

## 3. Liability areas

### A. Mental-health / medical / duty-of-care framing — *Priority: High (well-mitigated)*
- **Risk:** Emotional-support framing can imply therapy/treatment and create a duty of care or an FTC "health claim" problem.
- **Current state:** Marketing-ish copy leans warm — "Your safe place to land each day" (`app/register.tsx`), "Find rest in His Word" (`app/faith-intro.tsx`, `app/welcome.tsx`), "chosen for this moment" (`app/(tabs)/index.tsx`). **But** there is a strong **mandatory** disclaimer gate the user must accept — "It is not a mental health service and does not provide professional advice of any kind… call 988" (`app/onboarding-disclaimer.tsx`), a signup checkbox ("spiritual encouragement only — not professional advice", `app/register.tsx`), and `Terms §4` "NOT a Mental Health or Crisis Service."
- **Gap:** Mitigations are good; residual risk is the gap between warm marketing copy and the disclaimers. No medical-benefit claims found (good).
- **Document/clause:** Keep & keep-surfacing the medical/mental-health disclaimer (already in Terms §4 + in-app gate). Ensure App Store description and any marketing avoid outcome claims ("reduce anxiety," "heal," "feel better").

### B. Crisis / self-harm handling — *Priority: Med (well-mitigated)*
- **Risk:** If the app detects crisis content, failing to respond adequately — or appearing to be a crisis service — creates duty-of-care exposure.
- **Current state:** Strong, multi-layer: keyword detection with obfuscation normalization (`app-backend/functions/src/crisisKeywords.ts`), letter generation blocked + resources shown (`generateLetter.ts`, `app/check-in/letter-compose.tsx`), Say chat gating card with 988/741741 + `tel:`/`sms:` links (`app/(tabs)/say/[personaId]/[chatId].tsx`), a crisis-safe opener (`startSayChat.ts`), and a non-negotiable crisis protocol in the Say system prompt (`sayPrompt.ts`). `Terms §6` + `Privacy §7` already disclaim it as a "one-time automated check… not real-time monitoring."
- **Gap:** Minimal. The disclaimers are present and accurate. Keep the "not a crisis/monitoring/emergency service" language prominent.
- **Document/clause:** Existing crisis-service disclaimer (Terms §6 / Privacy §7) — **verify it stays accurate** if detection behavior changes.

### C. AI-generated content — *Priority: BLOCKER (Say disclosure) + High*
- **Risk:** AI output can be inaccurate, offensive, or distressing; users who believe a "voice" is a human can be misled (deception + emotional-harm exposure).
- **Current state:** Letters: AI nature disclosed in Terms §5 (names Anthropic, disclaims accuracy/theology), settings "About," and history share cards. **Say chat: the four "voices" (Kind/Still/Steady/Wise) are presented as characters with NO in-UI disclosure that they are AI** (`app/(tabs)/say/index.tsx`, `[chatId].tsx`). Say is not mentioned in Terms or Privacy at all.
- **Gap:** (1) Say's AI nature is undisclosed in the one place it matters most. (2) No point-of-use "AI can be wrong / not professional advice" near generated letters or chat. (3) Terms §5 covers "letters" but not Say responses.
- **Document/clause:** AI-Content Notice/Disclaimer covering **both** letters and Say; extend Terms §5 to name Say. **In-app:** add an "AI voice, not a real person" disclosure in the Say UI (flagged app change, not done this pass).

### D. Privacy — misstatements + undisclosed processing — *Priority: BLOCKER*
- **Risk:** The Privacy Policy affirmatively describes practices that no longer match the code. Inaccurate privacy disclosures are deceptive (FTC §5 / state UDAP), fail GDPR Art. 5(1)(a), and get apps rejected (Apple Guideline 5.1.1) or pulled.
- **Current state — confirmed contradictions (read first-hand):**
  | Policy statement | Reality in code |
  |---|---|
  | Summary: "your journal entries, verses, and letters are stored **only on your device — never on our servers**" (`privacy-policy.html` summary, §1, §2, §13) | **Say** stores every user + AI message **and** an AI-generated day-summary in Firestore indefinitely (`app-backend/functions/src/say/generateSayResponse.ts`, `startSayChat.ts`; `firestore.rules` `say/{uid}/…`). |
  | §5: "we **do not store push notification tokens** on our own servers" | `registerPushToken()` writes the Expo token (+ timezone, isPremium, mutedVoices) to **Firestore `pushTokens/{uid}`** (`src/services/notifications.ts`). |
  | §1: "We do **not** collect… crash/analytics telemetry beyond what Apple and Google collect" | **Sentry** is initialized when `EXPO_PUBLIC_SENTRY_DSN` is set (`app/_layout.tsx`) and can capture errors/breadcrumbs that may include user input; not disclosed. |
- **Also undisclosed:** the **reach-out** feature (AI-generated push messages derived from prior-day Say content — `notifications.ts`, `say/deliverReachOutForUser.ts`); onboarding-profile answers (faith background, life stage, intent — arguably religious-belief/special-category data under GDPR Art. 9).
- **Gap:** Privacy Policy must be rewritten to (a) remove the "never on our servers" absolute, (b) describe Say storage + retention, (c) describe reach-outs, (d) disclose Sentry (and ideally make it opt-out/off-by-default), (e) correct the push-token statement, (f) classify faith/emotional data as sensitive. App Store **privacy "nutrition label"** must match.
- **Document/clause:** **Privacy Policy — major update** (BLOCKER). App Privacy label update. Optional Sentry redaction/opt-in.

### E. Sub-processors, international transfers & DPA — *Priority: High*
- **Risk:** GDPR Art. 28 requires written processor terms; Art. 44+ requires a transfer mechanism (SCCs) for EU→US data. None are referenced.
- **Current state:** Processors in play: Anthropic (receives first name, emotion, verse, free-text reflection, and Say transcripts; **may retain for model improvement**), Firebase/Google (Auth + Firestore + Functions), RevenueCat, Sentry, Apple/Google, APNs/FCM. `Privacy §12` names Firebase + Anthropic as processors but there is no sub-processor **list**, no DPA/SCC reference, and **no in-app link to Anthropic's training opt-out**.
- **Gap:** No sub-processor list; no DPA/SCC language; Anthropic training exposure disclosed but not actionable in-app; Say transcripts (not just letters) now flow to Anthropic and should be named.
- **Document/clause:** **Sub-processor list** (public) + **DPA/SCC addendum** for EU users; add Anthropic opt-out pointer; confirm each vendor's DPA is executed (Google/Anthropic/RevenueCat/Sentry all offer them).

### F. Minors / COPPA / age rating — *Priority: BLOCKER*
- **Risk:** "13+" is represented in Terms §1 and Privacy §9, but **nothing in the app enforces it** (`app/register.tsx` collects name/email/password with no DOB/age check). Collecting emotional + (implicit) belief data from under-13s without verifiable parental consent is a COPPA problem; under-16 in parts of the EU raises GDPR Art. 8.
- **Current state:** No age gate anywhere; relies solely on store age rating.
- **Gap:** Need an actual age-gate/neutral age-screen at signup and an accurate App Store age rating; align the children's-privacy clause with whatever minimum age you enforce.
- **Document/clause:** Children's-Privacy clause (update) + **age-gate mechanism** (flagged app change) + correct age rating. Consider raising the floor to 16 or 17 to reduce minor-related duty-of-care on crisis content.

### G. Subscriptions / auto-renewal / EULA / refunds — *Priority: Med (mostly covered)*
- **Risk:** Auto-renewing subscriptions have strict disclosure laws (CA ARL, Apple/Google rules); billing that doesn't match entitlement is a consumer-protection risk.
- **Current state:** `Terms §3` has compliant Apple + Google auto-renewal text, refund delegation, 30-day price-change notice, and free-tier limits. Pricing $4.99/mo, $34.99/yr.
- **Gap:** (1) No standalone EULA — Apple's standard **Licensed Application End User License Agreement (LEULA)** likely suffices; confirm you're not required to provide a custom one. (2) **Entitlement sync is not wired and server-side premium is hardcoded `false`** (`purchases.ts`, `say/generateSayResponse.ts`; BUG-010/026, see `docs/SECURITY.md`) — a paying user can be shown "free," which is a billing-fairness/chargeback risk. (3) Free-tier "10 check-ins/day" is in Terms but the limiter is currently disabled (BUG-014).
- **Document/clause:** Confirm reliance on Apple/Google standard EULA (or add one); fix BUG-026/010 before charging real money; keep Terms §3 in sync with actual limits.

### H. User-generated content, acceptable use & moderation — *Priority: BLOCKER (Guideline 1.2)*
- **Risk:** Users submit free-text letters, journal reflections, and **AI chat messages** = UGC. Apple Guideline 1.2 requires UGC apps (especially AI chat) to provide content filtering, a way to **report** objectionable content, a way to **block** abusive users, and a published method to act on reports. CSAM/illegal content handling is mandatory.
- **Current state:** Input filtering + crisis detection exist (`inputFilter.ts`, `crisisKeywords.ts`); `Terms §9` has an acceptable-use list and at-will termination. **But** there is no in-app report/flag, no block, no appeals process, no explicit CSAM/hate-speech policy, no moderation SLA.
- **Gap:** Missing report/block mechanism + published moderation/CSAM policy.
- **Document/clause:** **Acceptable Use + UGC Moderation Policy** (new, or expanded Terms §9) including CSAM reporting (NCMEC), harassment, and an appeals note; **in-app report/block** (flagged app change). This is commonly a hard App-Review gate.

### I. IP & content licensing — *Priority: BLOCKER (Bible) + Med*
- **Risk:** Misrepresenting your content license, or shipping assets without attribution, is an IP/consumer problem.
- **Current state — confirmed inconsistency:** `Terms §8` states *"Scripture quotations are taken from the Holy Bible, New International Version®… Used by permission of Zondervan,"* **but the app ships KJV + WEB** (both public domain) per `app/settings.tsx` and `README.md` ("250 KJV + WEB curated verses"). So the Terms claim a commercial NIV license you likely don't have, for content you don't actually use. Fonts DM Sans, Lora, Space Mono are **SIL OFL 1.1** (require license-text reproduction); images (`jesus.png`, `nano*`, boy/girl) have no documented source/license. No `NOTICE`/`ATTRIBUTIONS`/`LICENSE` file in the repo.
- **Gap:** Wrong Bible attribution; missing font/image attribution; undocumented image provenance.
- **Document/clause:** Correct `Terms §8` to **KJV/WEB public-domain** attribution (and the in-app settings text already does this — align them). Add a **NOTICE/ATTRIBUTIONS** file (OFL text for the fonts; source/license for each image). Confirm every illustration is owned or licensed.

### J. Consent mechanics & data-subject rights — *Priority: Med*
- **Risk:** GDPR/CCPA require workable access/erasure/portability; consent for special-category data (religion, health-adjacent) is a higher bar.
- **Current state:** Signup requires accepting Terms+Privacy (checkbox, `register.tsx`). **Account deletion is implemented** (`deleteUserData` Cloud Function wipes Firestore + Auth + writes a `deletionAudit` record; wired in `settings.tsx`) — good, and also satisfies Apple's account-deletion requirement. Access requests are email-only (CCPA 45 days / GDPR 30 days stated).
- **Gap:** No self-service **data export** (portability); all-or-nothing consent (no granular opt-in for Sentry/reach-outs); no explicit consent flag for special-category (faith) data; indefinite Say retention conflicts with GDPR storage-limitation.
- **Document/clause:** Document the DSAR process + a Say **retention limit** (e.g., auto-delete after N days unless saved); consider a lightweight in-app export; granular consent (flagged app change).

### K. Trademark / branding — *Priority: Low (action, not a document)*
- **Risk:** "Soft Landing" is descriptive/common; another party may hold marks in the wellness/app space.
- **Current state:** Bundle `com.appsoftlanding.com`; no clearance on file.
- **Action:** Trademark clearance search + optional USPTO application before heavy marketing spend. Not a document to draft here.

### L. Standard contract protections — *Priority: present; validate only*
- Already in `docs/terms.html`: **Disclaimer of Warranties** (§12), **Limitation of Liability** (§13, capped at greater of 12-mo fees or $10), **Indemnification** (§14), **Arbitration + class-action waiver** (§16), **Governing law — California** (§17), **Force majeure / severability / assignment** (§18), survival clause (§15). Counsel should **validate enforceability** (esp. arbitration/class-waiver consumer-enforceability and the liability cap in CA) rather than re-draft.

---

## 4. Consolidated document checklist

| # | Document | Status | Covers areas | Priority |
|---|---|---|---|---|
| 1 | **Privacy Policy** | **Update (correct false statements)** | D, E, F, J | **BLOCKER** |
| 2 | **Terms of Service** | Update (add Say/reach-outs; fix §8 Bible; name Say in §5; UGC) | C, G, H, I | **BLOCKER** (Bible) + High |
| 3 | **Acceptable Use + UGC Moderation Policy** (new, or Terms §9 expansion) | New / expand | H | **BLOCKER** |
| 4 | **AI-Content Disclaimer / Notice** (letters **and** Say) | New / consolidate | C | High |
| 5 | **Mental-Health & Crisis Disclaimer** | Present — keep/strengthen | A, B | High (maintain) |
| 6 | **Sub-processor list + DPA/SCC addendum** | New | E | High |
| 7 | **Children's Privacy clause + age-gate** | Update + mechanism | F | **BLOCKER** |
| 8 | **EULA** | Confirm reliance on Apple/Google standard LEULA | G | Med |
| 9 | **NOTICE / ATTRIBUTIONS file** (fonts OFL, images) | New | I | Med |
| 10 | **Subscription / auto-renewal terms** | Present — verify vs. live limits | G | Med |
| 11 | **Trademark clearance** | Action (not a document) | K | Low |
| 12 | **Standard protections** (LoL, warranty, indemnity, arbitration) | Present — counsel to validate | L | Validate |

---

## 5. Launch-prioritized roadmap

**BLOCKERS — do before any external TestFlight / App Store submission:**
1. **Rewrite the Privacy Policy** to be accurate (remove "never on our servers"; disclose Say storage + retention, reach-outs, Sentry, push-token storage; classify faith/emotional data). Update the App Store privacy label to match. *(Area D)*
2. **Fix the Bible attribution** in Terms §8 → KJV/WEB public domain (align with in-app text). *(Area I)*
3. **Add an age gate** at signup + set the correct store age rating; align the 13+ (or higher) clause. *(Area F)*
4. **Add a report/block mechanism + published UGC moderation/CSAM policy** for the letters + Say chat (Apple 1.2). *(Area H)*
5. **Disclose that Say voices are AI** in the Say UI; extend the AI-content disclaimer to Say. *(Area C)*

**High — before charging real money / EU users:**
6. Wire RevenueCat entitlement sync + server-side premium check (BUG-010/026) so billing matches entitlement. *(Area G, `docs/SECURITY.md`)*
7. Sub-processor list + executed DPAs + SCCs for EU; add Anthropic opt-out pointer. *(Area E)*
8. Lock down the open `generateLetter` Cloud Run service (from `docs/SECURITY.md`). *(security + legal overlap)*

**Medium:**
9. NOTICE/ATTRIBUTIONS file (fonts + images). *(Area I)*
10. Say-message retention limit + document DSAR/export. *(Area J)*
11. Confirm EULA approach; re-enable/align free-tier limits (BUG-014). *(Area G)*

**Low:**
12. Trademark clearance before major marketing. *(Area K)*
13. Counsel validation of arbitration/class-waiver + liability cap enforceability in CA. *(Area L)*

---

## 6. Appendix — evidence index

- **Product framing / disclaimers:** `app/onboarding-disclaimer.tsx`, `app/register.tsx`, `app/faith-intro.tsx`, `app/welcome.tsx`, `app/(tabs)/index.tsx`, `app/settings.tsx`, `app/(tabs)/history.tsx`
- **Crisis handling:** `app-backend/functions/src/crisisKeywords.ts`, `generateLetter.ts`, `app/check-in/letter-compose.tsx`, `app/(tabs)/say/[personaId]/[chatId].tsx`, `say/startSayChat.ts`, `say/sayPrompt.ts`
- **Data / privacy surface:** `src/services/notifications.ts` (push-token → Firestore), `say/generateSayResponse.ts` + `say/startSayChat.ts` (Firestore message/day-summary storage), `say/deliverReachOutForUser.ts` (reach-outs), `app/_layout.tsx` (Sentry), `app/onboarding-profile.tsx` (faith/life-stage/intent), `firestore.rules`, `deleteUserData.ts`
- **Commercial / IP:** `docs/terms.html` (§3 subs, §5 AI, §8 Bible/NIV, §12–§18 protections), `src/services/purchases.ts`, `app/settings.tsx` (KJV/WEB text), `README.md`, `package.json` (fonts), `app-frontend/assets/images/*`
- **Existing docs:** `docs/terms.html`, `docs/privacy-policy.html`
- **Cross-refs:** `docs/SECURITY.md` (premium gating hardcoded `false`, Cloud Run lockdown), open bugs BUG-010 / BUG-026 (RevenueCat), BUG-014 (check-in limit)

> Reminder: hand this to a licensed attorney (ideally one familiar with consumer apps + health-adjacent/AI products)
> to draft and finalize the documents in §4. This file identifies the exposure and the needed instruments; it is not
> itself a legal document.
