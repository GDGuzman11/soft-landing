# Updating Soft Landing — Safe Update & Release Runbook

How to change the app after it's live, without breaking it. Read §1 (the mental model) once, then
use §0 (the decision table) and §7 (recipes) as your day-to-day reference.

**Golden rule:** the amount of ceremony a change needs depends entirely on *what layer* it touches.
Most changes **do not** require an App Store review. Figure out the layer first, then follow that
section.

---

## 0. TL;DR — what did you change, and how does it ship?

| You changed… | Channel | Command | Apple review? | Reaches users in |
|---|---|---|---|---|
| A Claude prompt, rate limit, Firestore rule, crisis list, backend logic | **Firebase** | `firebase deploy` | No | Seconds |
| Privacy Policy / Terms / any `docs/*.html` | **GitHub Pages** | `git push` | No | ~1 min |
| App text, UI, styling, screens, client logic (JS/TS only) | **EAS Update (OTA)** | `eas update --branch …` | No | Minutes (next app launch) |
| A native module, permission, SDK/Expo bump, app icon, `app.json` native config, version bump | **Native build** | `eas build` → `eas submit` | **Yes** | 1–3 days |
| Subscription price / IAP products | **Store dashboards** | App Store Connect + RevenueCat | No (store config) | Varies |

When in doubt: **did you change anything in `app.json`'s native section, add/remove a dependency, or
change native code? → native build. Otherwise → OTA or backend.**

---

## 1. The four release channels (mental model)

Soft Landing is not one monolith. It has four layers that ship independently:

1. **Backend — Firebase Cloud Functions + Firestore rules.** All server logic: letter/Say generation,
   the Claude calls and prompts, rate limits, crisis detection, account deletion. Deploys instantly,
   no store involvement. *A huge share of behavior lives here — prefer changing logic here when you can.*
2. **Web content — GitHub Pages.** The hosted legal docs (`docs/privacy-policy.html`, `terms.html`)
   that the app links to. Push to git → live.
3. **OTA JavaScript — EAS Update.** The app's JS/asset bundle. Fix copy, UI, styling, or client logic
   and push it to installed apps with no rebuild and no review.
4. **Native binary — EAS Build + App Store.** The actual app package. Needed only for native changes
   or a normal versioned release. Gated by Apple review.

**Strategic implication:** the more logic you keep in the backend and JS layers, the faster you can
fix things. Native/App-Store is the slow path — minimize how often you need it.

---

## 2. Before you ship ANYTHING — safety gates

Run these every time, regardless of channel:

1. **Type-check the frontend:** `cd app-frontend && pnpm exec tsc --noEmit` → must exit 0.
2. **Build the backend (if you touched functions):** `cd app-backend/functions && npm run build` → exit 0.
3. **Test it.** Local dev (`npx expo start`) for JS; a throwaway account on a preview/TestFlight build
   for anything touching auth, payments, deletion, or backend.
4. **Commit cleanly and push.** One concern per commit, Conventional Commits
   (`feat:`/`fix:`/`chore:`/`docs:`/`security:`). The repo is the source of truth; EAS builds and
   `eas update` publish from your committed/working state.
5. **Ship to preview/staging before production.** Never push an OTA or a build straight to all users
   without seeing it on a device first.

**Never commit secrets.** `.env`, `scripts/service-account-key.json`, `GoogleService-Info.plist`,
`*.p8` are gitignored — keep it that way. Client config (`EXPO_PUBLIC_*`) is public-by-design and
lives in `eas.json`.

---

## 3. Channel A — OTA JavaScript updates (EAS Update)

**Use for:** text, copy, UI layout, styling, images, client-side logic — anything that is JS/assets
only and does **not** change native code.

**Prerequisites:**
- The target build must have been built **with** `expo-updates` (i.e. any build from 2026-10-21
  onward). Older installs can't receive OTA.
- Logged in: `npx eas-cli login` (your Expo account — not Apple).
- Channels are wired: `preview` build → `preview` branch, `production` build → `production` branch.

**Steps:**
1. Make the JS change; run the §2 gates; test locally (`npx expo start`).
2. Publish to **preview** first:
   ```
   cd app-frontend
   npx eas-cli update --branch preview --message "what changed"
   ```
3. On a **preview/TestFlight device**, fully close and reopen the app **twice** — expo-updates
   downloads on the first relaunch and applies on the next. Confirm the change, confirm nothing broke.
4. Promote to **production**:
   ```
   npx eas-cli update --branch production --message "what changed"
   ```

**Inspect / manage:**
```
npx eas-cli update:list        # published updates
npx eas-cli branch:list        # branches
npx eas-cli channel:list       # channels → which branch they point to
```

**Rollback (if an OTA breaks something):**
```
npx eas-cli update:rollback     # re-serve the previous update on that branch
```
The rollback reaches devices on their next launch, same as any update.

**⚠️ Fingerprint caveat:** runtimeVersion policy is `fingerprint`. If you change a **native**
dependency, the fingerprint changes and your OTA will **not** reach existing builds (by design — it
prevents shipping JS that assumes native code the binary lacks). The CLI will warn you. That case
means "cut a new build" (§6).

---

## 4. Channel B — Backend (Firebase Functions / Firestore rules)

**Use for:** prompts (`prompt.ts`, `sayPrompt.ts`), the Claude model, rate limits, crisis keywords,
input filters, Firestore security rules, any server logic.

**Deploy:**
```
cd app-backend
firebase deploy --only functions            # all functions
firebase deploy --only functions:generateLetter   # a single function
firebase deploy --only firestore:rules       # rules only
```
The predeploy hook builds TypeScript automatically (`npm run build`).

**Verify after deploy:** test the affected flow on a device, and check logs in the Firebase Console
(Functions → Logs) or `firebase functions:log`.

**Guardrails:**
- **Node 22 runtime** — set in `app-backend/functions/package.json` (`engines.node: "22"`). Don't drop
  back to 20 (decommissioned).
- **Do NOT remove `invoker: 'public'`** from the `onCall` functions — it is *required* for Firebase
  callable functions to work; auth is enforced in-code via `request.auth`. Removing it breaks the app.
- **Secrets:** `ANTHROPIC_API_KEY` lives in Secret Manager. View with
  `firebase functions:secrets:access ANTHROPIC_API_KEY`; set with `firebase functions:secrets:set`.
  If you rotate it, redeploy the functions that declare it.

---

## 5. Channel C — Legal / web content (GitHub Pages)

**Use for:** `docs/privacy-policy.html`, `docs/terms.html`, any hosted page.

Edit the file → commit → `git push origin master`. GitHub Pages redeploys in ~1 minute; the live URLs
(`https://gdguzman11.github.io/soft-landing/…`) update. The app links to these, so no app update is
needed for legal-copy changes — but **bump the "Last updated" date** and, for material changes, notify
users per the Terms.

---

## 6. Channel D — Native build + App Store submission

**Required when you change any of:** a native dependency (add/remove a package with native code),
app permissions, the Expo SDK, `app.json` native config (bundle id, icon, splash, plugins,
`infoPlist`, entitlements), or you're cutting a normal versioned release.

**Builds authenticate with the App Store Connect API key** (Apple ID login is broken on this account).
Set these env vars in the same PowerShell window before building (same values as your `.p8` setup):
```
$env:EXPO_ASC_API_KEY_PATH="C:\Users\User\Desktop\Keys\AuthKey_XXXXXX.p8"
$env:EXPO_ASC_KEY_ID="XXXXXXXXXX"
$env:EXPO_ASC_ISSUER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
$env:EXPO_APPLE_TEAM_ID="ULB2XP7LFC"
$env:EXPO_APPLE_TEAM_TYPE="INDIVIDUAL"
```

**Build:**
```
cd app-frontend
npx eas-cli build --profile preview --platform ios      # internal/TestFlight-style build
# or, for a store release:
npx eas-cli build --profile production --platform ios
```
- Answer **No** to the Push Notifications prompt (already configured; `promptToConfigurePushNotifications: false`).
- `production` auto-increments the build number; for `preview` bump `ios.buildNumber` in `app.json` if
  re-uploading.
- `--clear-cache` forces a fresh native build (use after adding native modules).

**Submit to the App Store / TestFlight:**
```
npx eas-cli submit --profile production --platform ios
```
Then in **App Store Connect**: fill release notes, attach the build, submit for review (~1–3 days).
Use **phased release** for production so a bad build reaches users gradually.

**Device registration:** `preview` is internal distribution — new test devices must be registered
(`npx eas-cli device:create`, then rebuild) to install.

---

## 7. Recipes (common tasks, exact commands)

**Fix a typo / reword a screen (JS):** edit the `.tsx` → `tsc` → commit/push →
`npx eas-cli update --branch preview -m "copy fix"` → verify on device → `--branch production`.

**Change a Claude prompt or a rate limit (backend):** edit `app-backend/functions/src/…` → `npm run
build` → commit/push → `cd app-backend && firebase deploy --only functions` → test the flow.

**Update the Privacy Policy / Terms:** edit `docs/*.html` (bump the date) → commit → `git push`.

**Add a native dependency:** `npx expo install <pkg>` → configure → `tsc` → commit/push → **new build**
(`eas build`) → `eas submit`. (OTA can't deliver this.)

**Cut a TestFlight build:** set the ASC env vars (§6) → `npx eas-cli build --profile preview --platform
ios` → install from the link → test.

**Submit V1 to the App Store:** `eas build --profile production` → `eas submit --profile production
--platform ios` → finish the listing + submit in App Store Connect.

**Emergency hotfix:**
- Broken JS in production → `npx eas-cli update:rollback` (or publish a fixed `eas update`).
- Broken backend → fix + `firebase deploy --only functions` (or roll back the code and redeploy).
- Broken native code (rare) → you're gated by review; request an **expedited review** from Apple.

---

## 8. Rollback cheat-sheet

| Layer | Undo |
|---|---|
| OTA JS | `npx eas-cli update:rollback` (previous update re-served on next launch) |
| Backend | `git revert` the change → `firebase deploy --only functions` |
| Web docs | `git revert` → `git push` |
| Native binary | Can't "undo" a shipped binary — ship a fixed build; use App Store phased release / remove from sale if severe |

---

## 9. Environment & credentials reference

- **Expo/EAS projectId:** `2d79e638-f797-42ff-86b3-94f5c20fa6ff`
- **Bundle id:** `com.appsoftlanding.com` (iOS + Android)
- **Firebase project:** `soft-landing-afe2d`
- **OTA channels:** `development`, `preview`, `production` (in `eas.json`); runtimeVersion policy
  `fingerprint`
- **Functions runtime:** Node 22
- **Package manager:** pnpm 10.7.0 (pinned in `app-frontend/package.json`; EAS uses it via Corepack)
- **Apple auth for builds:** App Store Connect API key via `EXPO_ASC_*` env vars (not Apple ID login)
- **Secrets (never commit):** `.env`, `service-account-key.json`, `GoogleService-Info.plist`, `*.p8`

---

## 10. Before a release

Work the two-lane checklist in **`docs/LAUNCH-CHECKLIST.md`** (Engineering + Business lanes, tiered,
free-first). Security posture notes live in `docs/SECURITY.md`; the legal gap map in
`docs/LEGAL-REVIEW.md`.

_Last updated: 2026-10-21._
