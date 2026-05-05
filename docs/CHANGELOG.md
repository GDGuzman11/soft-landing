# Changelog

All notable changes to Soft Landing will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] — 2026-05-03

### Added
- **Say feature** — new AI chat tab with 4 voice personas (Kind / Still / Steady / Wise). Per-persona threaded conversation stored in Firestore, 30-message rolling history window, typing indicator, crisis keyword routing to `/crisis` screen, and canary token leakage detection.
- **Say rate limiting** (`sayRateLimit.ts`): transactional Firestore counters — 100 msg/day free, 500/day premium, 20 msg/60s burst window. UTC midnight daily reset.
- **Say error states** — discriminated `ErrorKind` union (`failed` / `rate_burst` / `rate_daily` / `blocked`) replaces generic boolean `errored` flag. Each state shows a distinct message; rate-limit errors hide the retry button.
- **Dark mode** — all screens now respond to the dark mode toggle: `sign-in.tsx`, `register.tsx`, `onboarding.tsx`, `onboarding-profile.tsx`, `verify-email.tsx`, `letter-compose.tsx`, `envelope.tsx`, `LetterCard.tsx`, `TourTooltip.tsx`. All hardcoded light hex values replaced with `colors.*` tokens from `useTheme()` via inline styles.
- **Shared `mapFirebaseError` util** (`src/utils/firebaseErrors.ts`): extracted from duplicate definitions in `sign-in.tsx` and `register.tsx` — single source of truth for Firebase error code → user-facing string mapping.

### Changed
- **Letter prompts v1.6** (`prompt.ts`): each of the 5 emotion goals now opens with a mode-shift anchor (identity statement: who the letter-writer IS for that emotion), a "what you are not" exclusion line, and a Gen Z tone calibration note. Existing paragraph goals untouched. Brings letter voice closer to Say voice identity-first architecture.
- **Say voice prompts** (`sayPrompt.ts`):
  - **Kind** — question discipline added: warmth comes through presence; one quiet question max per thread, never when they're deep in it.
  - **Steady** — grounding question added after step 3: one task-shrinking question ("what's the one thing you need to get through tonight?") when it helps the person land somewhere smaller.
  - **Wise** — question instruction reinforced: "ask a question… and mean it. Not rhetorical, not leading. A real question you don't already know the answer to."
  - **Still** — unchanged (questions would break its identity).
- **History tab UX**: delete now requires confirmation via `Alert.alert` before `handleDelete` fires. Letter expand/collapse animates with 200ms opacity fade via `Animated.Value` per-item. Haptic fires on delete.
- **Settings toggles**: `Haptics.impactAsync(ImpactFeedbackStyle.Light)` fires on every toggle (`darkMode`, `notifications`, `voiceMute`).
- **Emotion picker**: `Haptics.impactAsync` fires on committed swipe via `runOnJS` in the gesture handler.
- **Session summary empty state**: silent redirect replaced with 1.5s "Nothing saved this session." message in `colors.inkMuted` before routing home.
- **Letter compose loading states**: `return null` blank screen replaced with `ActivityIndicator` during verse data load; `generating` state added to button — shows "Writing your letter…" + opacity 0.6 while Claude call is in-flight.

### Fixed
- `mapFirebaseError` was duplicated with divergent error cases in `sign-in.tsx` and `register.tsx` — unified in shared util.
- Dead gate `const canUseLetter = true` and unreachable `if (!canUseLetter)` block removed from `letter-compose.tsx`.
- `FieldValue` unused import removed from `sayRateLimit.ts`.

## [1.7.0] — 2026-04-30

### Changed
- **Emotion picker — new illustration set**: Replaced 5 original emotion photos with new `nano*.jpg` illustrations (`nanohappy`, `nanoneutral`, `nanotired`, `nanosad`, `nanostressed`).
- **Emotion picker — image loading placeholder**: Swipe now shows a warm parchment placeholder (`#EDE6D9`) with a gently breathing ✦ glyph (in the emotion's brand color) while the next image decodes. The emotion label, shimmer ✦, and tagline are hidden during loading and fade in together with the image via `onLoad` callback. `key={emotion?.id}` on `ImageBackground` forces a clean remount on every swipe so `onLoad` always fires for the correct image.
- **Emotion picker — off-screen preloader**: Hidden preloader now renders all 5 images at full card dimensions (`CARD_W × CARD_H`) at `left: -9999` instead of the previous 1×1 pixel / 0×0 container approach. This forces the GPU to decode textures at display resolution before the user's first swipe.
- **Pre-launch to-do list** (`docs/TODO.md`): Full master checklist added covering App Store and Google Play submission requirements, security posture, Firebase tasks, legal screens, and a 29-step ordered dependency chain.

### Fixed
- Off-screen image preloader was rendering inside a `0×0` clipped container — children were being clipped entirely on Android (default `overflow: hidden`). Fixed by positioning at `left: -9999` with no size constraint on the container.

## [1.6.0] — 2026-04-30

### Changed
- **Emotion picker — full redesign** (`app/check-in/emotions.tsx`): Replaced vertical snap-scroll card list with a single-card swipe experience. One card is visible at a time; the card follows the user's finger and flies off screen at 70pt threshold or 500px/s velocity. `advance()` instantly swaps `activeIndex`, the new card image fades in over 300ms while the frame (border + pulsing glow shadow) stays continuously visible. Image order: Good → Neutral → Tired → Sad → Stressed. Each card shows a full-bleed biblical illustration (`happy1`, `neutral1`, `tired1`, `sad3`, `stressed1`) behind a 3pt warm-brown (`#7A5030`) border at 26pt radius. Pulsing amber glow shadow (`withRepeat + withSequence`) and shimmer ✦ glyph restart via `cancelAnimation` on every card change.
- **Emotion picker — image pre-loading**: A hidden `View` renders a 1×1 `Image` for each of the 5 emotion photos at mount time, forcing all images into the native decoder cache before the user swipes. Eliminates per-swap decode lag.
- **Emotion picker — Go Home button**: Centered `Pressable` below the pagination dots, calls `router.back()`. Muted warm-gray label (`#A09080`) so it doesn't compete with the emotion cards.
- **Home screen — ambient background images**: `boy.png` (top-left, `screenWidth × 1.0`) and `girl.png` (bottom-right, `screenWidth × 0.82`) render as `Animated.Image` at `zIndex: 0` behind all content. Both fade from 0 → 0.35 opacity via `withDelay(300, withTiming(0.35, { duration: 2000 }))` on every tab focus (`useFocusEffect`). Content views are `zIndex: 1`.
- **Home screen — stamp icon**: Replaced `icon.png` (cream background) with `icon-nobackground.png` (transparent) so the stamp floats naturally over the background.
- **Widgets tab — icon**: Tab bar icon changed from `⊞` to `❖` to match app ornamental theme.
- **Widgets tab — section dividers**: `SectionDivider` component added between Small, Medium, and Large sections — two amber hairlines with a centred ✦ glyph, opacity 0.3/0.6.
- **History tab — empty state icon**: `✉` envelope emoji replaced with `✦` amber glyph (`#C4956A`, 36pt, 0.6 opacity) for visual consistency with the app's ornamental language.

---

## [1.5.0] — 2026-04-29

### Added
- **Full KJV + WEB Bible in Firestore**: 31,102 verses imported across both translations. 250 curated verses (50 per emotion, 25 free / 25 premium) tagged with `emotionTags[]` and `emotionMeta` per doc. Script: `scripts/import-bible-to-firestore.js`.
- **Firestore verse selector** (`src/messages/selector.ts`): Rewired from local `catalog.json` to Firestore `where('emotionTags', 'array-contains', emotionId)`. 24h AsyncStorage cache per emotion (`@soft_landing/verse_pool/${emotionId}`), stale-cache fallback on network failure, weighted selection with 48hr anti-repetition penalty window.
- **Randomized translation per card**: Each swipe independently picks KJV or WEB (50/50 coin flip). `envelope.tsx` and `message.tsx` both use `Math.random() < 0.5` against `msg.modernText` presence. Users see variety across swipes without both translations on the same card.
- **letterService unit tests** (`app-frontend/src/services/__tests__/letterService.test.ts`): 7 Vitest tests covering happy path, blocked, crisis, rate-limited, generic error, and emotionId passthrough — all passing.
- **Firestore security rules**: `/verses/{verseId}` requires authenticated read; writes blocked globally.

### Changed
- **NIV → KJV + WEB** (copyright remediation): NIV (Biblica, copyrighted) removed entirely. All verses now KJV (public domain, 1611) with optional WEB (World English Bible, public domain) modern-language paraphrase in `modernText` field. Legal exposure eliminated before App Store submission.
- **AI letter prompts rewritten** (`prompt.ts` — `getEmotionParagraphGoals()`): All 5 emotion instruction sets replaced with conversational, presence-focused equivalents. Key shifts:
  - Language is inhabited, not observed — model is told to be in the moment with the user
  - Calibrated humor permitted for stressed/tired/neutral/good; explicitly absent for sad
  - Gen Z casual phrasing invited for neutral ("just one of those days") and good
  - Verse instruction strengthened: "surface naturally... like it found them, not like it was given"
  - Anti-resolution language made more explicit (tired/sad: "do not move toward resolution")
- **Em dash ban reinforced**: Prohibition added to `buildSystemPrompt()` (system level) in addition to the existing user-prompt rule. Now enforced at both layers.
- **`Message.modernText`**: Changed from `required string` to `optional string` in `types/index.ts` to accommodate verses without a WEB paraphrase.

### Fixed
- **History and Session Summary showing "…"**: Both screens used catalog.json ID lookup; after the Firestore migration, old IDs (e.g. `sad-001`) didn't match new IDs (e.g. `psalms_34_18`). Fixed with `lookupVerse()` helper reading from the AsyncStorage verse pool cache.
- **Dashboard TypeScript error**: `dashboard/index.tsx` imported from catalog.json which was removed. Replaced with `CURATED_PER_EMOTION = 50` constant; removed dead verse preview block.

### Security
- Firestore rules updated: verse reads gated behind Firebase Auth — unauthenticated clients cannot access the verse corpus.

---

## [1.4.1] — 2026-04-26

### Added
- **Resonant line highlight**: After the typewriter finishes, the single most emotionally resonant sentence Claude wrote fades in a 2px amber left border rule (opacity 0→1, 600ms delay, 900ms `withTiming`, `Easing.out(Easing.quad)`). Text was already visible during typing — only the rule animates in. Graceful fallback if Claude omits the markers: full letter renders as plain text with no crash.
- **Verse pull-quote block**: The Bible verse is lifted out of the letter body and rendered as a centered pull-quote block between paragraphs 1 and 2. Hairlines draw outward from center, verse fades up from below, reference fades in last. Typewriter gates paragraph 2 until the pull-quote animation settles (~1.1s).

### Fixed
- **`app-backend/functions/tsconfig.json` error**: TypeScript 5.9 requires explicit `rootDir` when `outDir` is set. Added `"rootDir": "src"` — previously the inferred value was silently accepted, now an error.

### Prompt
- **Resonant line instruction added to `prompt.ts`**: Claude is instructed to wrap the single most emotionally resonant sentence it wrote in `[[double brackets]]`. Frontend strips these for the typewriter, then re-parses for segmented rendering after typing completes.

### Docs
- **`docs/SECURITY.md`**: Security policy moved from repo root to `docs/` and fully rewritten to reflect v1.4 state — AI letter data flow, 4-layer input security pipeline, rate limiting, Firestore rules, pre-launch checklist with all open security items.
- **`docs/ARCHITECTURE.md`**: Complete rewrite — v1 local-only description replaced with accurate v1.4 architecture covering Firebase Auth, Cloud Functions, AI letter pipeline, 4-layer prompt personalization, AppSettings schema, input security layers, rate limiting, and full screen/module maps.

---

## [1.4.0] — 2026-04-25

### Fixed
- **AI letters were never calling Claude** (root cause): `ANTHROPIC_API_KEY` existed in Firebase Secret Manager but was not declared in the `onCall()` options. Without `secrets: ['ANTHROPIC_API_KEY']`, `process.env.ANTHROPIC_API_KEY` was always `undefined` at runtime and every call silently fell through to the static mock-letter fallback. Added `secrets: ['ANTHROPIC_API_KEY']` to `onCall()` — letters now call Claude Sonnet 4.6 for real.
- **Questionnaire data not reaching letters for existing users**: Home screen nav guard used `!s.profileComplete && !s.faithIntroComplete` (AND), so users who had already completed faith-intro but had null profile answers were never routed to the questionnaire. Changed to `!s.profileComplete` — existing users now see the profile screen once on next launch.

### Changed
- **Prompt engineering — 4-layer personalization system**:
  - User input moved to the top of the prompt (before emotion goals) so Claude weights it heavily rather than treating it as a trailing afterthought
  - Rewrote input instruction: "The first paragraph must address this directly — not echoing their words back verbatim, but making it unmistakably clear you heard exactly what they said"
  - Added verse engagement rule: "engage with its specific words and imagery — the reader should recognize which verse this is from the way you use it"
  - Separated em dash ban into its own emphatic rule: "Do not write the em dash character (—) anywhere. Not once."
  - Added "this season" to banned phrases (Claude was bypassing "in this season" via the variant "this season is asking")
- **Letters auto-save**: `handleSend()` in `letter-compose.tsx` now calls `updateSavedMessage()` immediately after generation — letter persists to History without requiring the user to tap Save

### Backend
- Upgraded model from `claude-haiku-4-5-20251001` to `claude-sonnet-4-6` for reliable emotion-aware paragraph structure and personalization quality

---

## [1.3.0] — 2026-04-24

### Added
- **"How It Works" editorial screen** (`app/tour.tsx`): Scrollable pre-entry guide shown to visitors who tap "How It Works" on the welcome screen. Four clearly labelled sections — **Check In**, **Your Verse**, **Your Collection**, **Letters** — written in warm, readable prose matching the app's typographic voice (amber uppercase labels, Lora italic headings, DM Sans body). Amber cross header, ✦ ornament divider, thin rule separators between sections, and a closing note in muted Lora italic. Fixed bottom bar with amber **Begin →** pill and a muted "or skip to get started" link. Header fades in on mount; content crossfades in 200ms later.
- **Onboarding profile screen** (`app/onboarding-profile.tsx`): 3-question profile captured after registration — faith background ("Where are you with faith right now?"), primary intent ("What are you most looking for?"), and life stage ("Which of these feels most like you?"). Design A "Candlelight": parchment option cards (`#FDF9F4`), amber glow shadow + scale spring on selection, Lora typography for option text, ✦ progress ornaments (not dots), crossfade-only transitions, "I'd rather not say" skip in Lora italic.
- **`TourTooltip` component** (`src/components/TourTooltip.tsx`): Reusable bottom-anchored parchment sheet (`#F5F0E8`) for contextual in-app guidance. Supports plain text mode and symbol-row mode (icon + label pairs). Entrance: spring up from below + fade. Dismiss: slide down + fade, then `onDismiss` fires after 260ms.
- **History tab tour hint**: Guest users returning from the check-in flow see a tooltip on the History tab explaining the saved verses collection.
- **Home tab tour hint**: The final tour step on the Home tab invites guest users to create an account.

### Changed
- **"Continue as Guest" renamed to "How It Works"** on the welcome screen — more inviting and action-oriented than "Continue as Guest"; accurately frames what tapping it delivers.
- **Guest routing**: Tapping "How It Works" now opens `app/tour.tsx` (the editorial guide) instead of dropping users directly into the check-in flow with route params.
- **Onboarding flags pre-set on guest entry**: `handleGuest()` now sets `disclaimerAccepted`, `onboardingComplete`, `faithIntroComplete`, and `profileComplete` to `true` before launching the tour — prevents the home screen nav guard from redirecting guest users back through the onboarding or disclaimer flows.

### Fixed
- **App crash on first verse swipe** (BUG-024): Restored `runOnJS` wrapping around `setTransitioning` and `handleSaveAndNext`/`handleDiscardAndNext` calls in the gesture handler's `onEnd` worklet. Direct React state mutation from the UI-thread gesture worklet caused the app to close on first swipe. All state setter calls from worklet context are now wrapped with `runOnJS`.
- **Double questionnaire on registration** (BUG-025): `verify-email.tsx` and Google/Apple registration paths now route to `/onboarding-disclaimer` instead of jumping directly to `/onboarding`. Previously, the home screen's nav guard fired a second redirect to `/onboarding-disclaimer` after the full flow completed, sending users through the questionnaire a second time.
- **Tour routing to empty History**: Tour users who never saved a verse were routed to the History tab, which showed an empty state with a confusing tooltip. Tour now routes directly to the Home tab after the check-in flow.

### Backend
- **Crisis input filtering** (`functions/src/inputFilter.ts`): New module strips angle brackets and backtick sequences from user input before prompt interpolation, guarding against prompt injection. Expanded crisis keyword list to include indirect expressions of self-harm.
- **Firestore security rules** (`firestore.rules`): Deny-all rules deployed — only `letterUsage/{uid}` is accessible by the authenticated owner (rate-limit tracking). All other paths blocked.
- **Prompt quality rewrite** (`functions/src/prompt.ts`): Removed mechanical FIRST/SECOND/THIRD section labels, expanded banned-phrases list ("I want you to know", "you are not alone", "lean into", etc.), added explicit instruction to use user's exact words near-verbatim when present.

---

## [1.2.0] — 2026-04-20

### Added
- **Firebase Authentication**: Email/password and Google Sign-In via expo-auth-session. Full auth service layer with `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signOutUser`, `subscribeToAuthChanges`.
- **Email verification flow**: After registration, users receive a verification email. New `verify-email.tsx` screen with "I've verified" check, 30-second resend cooldown, and "Wrong email? Go back" escape.
- **Welcome screen** (`welcome.tsx`): Combined splash + auth entry point. White cross glow with two staggered ripple rings (Option 2) and cross border glow pulse (Option 4). Replaces the standalone splash. Buttons: Create Account, Sign In, Continue as Guest.
- **Sign-in screen** (`sign-in.tsx`): Email + password form with Google OAuth, error code mapping, forgot password stub, and link to register.
- **Guest mode**: Users can continue without an account — `isGuest` flag in AppSettings gates limited access. 
- **Firebase auth persistence**: Auth tokens now persist across cold app restarts via `getReactNativePersistence(AsyncStorage)`.
- **Auth-aware navigation**: Home screen and settings properly handle auth state. "Start over" signs out the Firebase session before clearing local data.

### Fixed
- Firebase auth tokens lost on cold restart — inMemoryPersistence replaced with AsyncStorage persistence (BUG-012)
- Duplicate `AuthUser` type — canonical definition consolidated in `src/types/index.ts` with `emailVerified` field; auth.ts imports from types (BUG-013)
- Module-level `navigationChecked` flag in index.tsx broke auth guard after sign-out — replaced with `useRef` (BUG-015)
- New Google users skipped `faithIntroComplete` check — name-saving decoupled from navigation chain (BUG-016)
- Settings "Start over" did not sign out Firebase user — added `signOutUser()` before navigation (BUG-017)
- `faith-intro.tsx` had wrong `accessibilityLabel` ("Welcome screen") (BUG-018)
- `cancelAll()` nuked all scheduled notifications — now uses `cancelScheduledNotificationAsync(NOTIFICATION_ID)` (BUG-019)
- `scheduleDaily()` silently accepted invalid time strings — added HH:mm regex guard (BUG-020)
- `package.json` name was "expo-init-temp" — updated to "soft-landing" (BUG-021)
- Register screen had no client-side password length validation before Firebase submission (BUG-023)

### Known Issues
- BUG-010: Paywall purchase buttons are no-ops — RevenueCat integration pending
- BUG-011: Anti-repetition system non-functional — usageCount/lastUsed not persisted to storage
- BUG-014: `canCheckIn()` bypass active — must be re-enabled before App Store submission
- BUG-022: Welcome screen flashes briefly on cold launch for signed-in users (Firebase rehydration race)

## [1.1.0] — 2026-04-18

### Added
- **Bible verse pivot**: Replaced 25 generic validating messages with NIV Bible verses (5 per emotion). Each verse includes a scripture reference (e.g., "Psalm 34:18") displayed in amber below the verse body.
- **Faith intro screen**: One-time screen shown after onboarding — amber cross, "Find rest in His Word." tagline in Lora italic, amber Begin button. Saved to `faithIntroComplete` in AppSettings.
- **In-app splash screen** (`splash.tsx`): Branded launch screen with animated amber cross spring-in and "Soft Landing" / "Find rest in His Word." fade-in. Runs on every cold launch before home screen.
- **Continuous verse flow**: After swiping on the message screen, a new verse slides in from the opposite side without returning to Home. Users stay in a verse flow until they tap Done or ×.
- **Swipe gestures on message screen**: Swipe right = Save + next verse, Swipe left = Skip + next verse. Tinder-style indicator badges animate in during swipe. SWIPE_THRESHOLD = 110px.
- **Candle wax seal envelope**: Redesigned envelope as a sealed card (CARD_WIDTH=85%, CARD_HEIGHT=370). Wax seal component with 8 drip blobs, candle-light highlight, embossed cross. Seal pulses on tap before navigation.
- **Scripture reference in history**: Saved verses in the history screen now show the scripture reference in amber. Each saved verse has a Share button (native share sheet).
- **Free tier raised to 10 check-ins/day** (up from 3).

### Fixed
- Double-splash flicker: reduced `_layout.tsx` minDelayDone timer from 1800ms to 200ms — splash.tsx now fully owns branded splash timing (BUG-007)
- `transitioning` stuck true when paywall pushed from `loadNextVerse` — reset before routing (BUG-001)
- Save/discard indicator badges on wrong sides — swapped to match swipe direction (BUG-002)
- `transformOrigin` removed from envelope fold creases (not supported in React Native) (BUG-003)
- Envelope error state: added Go Home escape when `performCheckIn` throws (BUG-004)
- Duplicate `FREE_CHECKINS_PER_DAY` constant in `theme.ts` — synced to 10 (BUG-005)
- Duplicate `"fetch"` in `UIBackgroundModes` in `app.json` (BUG-006)
- Unused `Dimensions` import removed from `onboarding.tsx` (BUG-008)
- `emotions.tsx` paywall navigation changed from `replace` to `push` so back returns to emotion picker (BUG-009)

## [1.0.0] — 2026-04-18

### Added

**Foundation (Phase 0)**
- Project skeleton: `app-frontend/`, `app-backend/` (reserved), `app-qa/`, `docs/`
- Agent team established with non-overlapping file ownership (frontend, data, security, tester, docs)
- Core TypeScript types: `EmotionId`, `Message`, `CheckInEvent`, `SavedMessage`, `AppSettings`, `SubscriptionState`
- Design tokens: colors, typography, spacing, radius, shadow, animation constants
- Emotion catalog: 5 emotions with brand colors (stressed, tired, sad, neutral, good)
- Security policy (`SECURITY.md`), environment variable template (`.env.example`), Phase 3 review checklist
- Bug tracker schema (`docs/bugs.json`)
- Live agent status dashboard (`scripts/dashboard-server.js`) on port 3131

**Expo Project (Phase 0)**
- Expo SDK 54, Expo Router v6, React Native 0.81.5
- NativeWind v4 with `babel.config.js`, `metro.config.js`, and `tailwind.config.js`
- DM Sans (UI) + Lora (messages) via `expo-google-fonts`
- Full screen suite: Home, Emotions, Envelope, Message, History, Settings, Paywall, Onboarding, Dashboard (dev)
- Tab navigation: Home ✦ / Saved ☆ / Settings ◎

**Data Layer (Phase 1)**
- 25 hand-written validating messages (5 per emotion, free tier)
- Weighted random message selector with 48-hour anti-repetition penalty
- AsyncStorage typed service layer: settings, check-in events, saved messages
- Daily quota counter: resets at device midnight, enforces 3 free check-ins/day
- `checkIn.ts` service: `canCheckIn()`, `performCheckIn()`, `bookmarkMessage()`

**Core Flow (Phase 1–2)**
- Emotion picker: vertical full-width card stack, haptic on tap
- Envelope screen: spring fly-in, idle bob loop (6s), "Tap to open" fade-in at 1.2s
- Envelope open animation: flap rotates -180°, letter slides up, screen fades before navigating
- Message reveal: card springs up from below, Lora serif body text
- Save (☆→★) with success haptic, share via native share sheet, dismiss (×)
- History screen: saved messages with date, empty state, swipe-to-delete
- Paywall: Monthly ($4.99) / Annual ($34.99), no guilt language, redirects on free-tier limit
- Onboarding: 2-slide animated flow with dot indicators, saves `onboardingComplete` to storage

**Polish (Phase 3)**
- Entrance animations on Home (greeting + button fade/spring)
- Haptics throughout: emotion tap (Light), envelope open (Medium), save (Success)
- Full accessibility: `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, enlarged `hitSlop`
- Dark mode color tokens in Tailwind config
- Settings screen: subscription status, Upgrade CTA, haptics toggle, notification toggle

**Production Readiness (Phase 4)**
- `eas.json`: development (simulator), preview (internal distribution), production (App Store / Play Store)
- `app.json`: notification permissions, build numbers, Android permissions
- GitHub Actions CI: TypeScript check + Vitest + Expo web export check on every push/PR

### Fixed
- Black screen on launch: removed AsyncStorage gate from root layout render guard
- Onboarding redirect loop: module-level `onboardingChecked` flag prevents re-redirect when AsyncStorage is unavailable
- AsyncStorage `native module is null`: downgraded from v3.0.2 → v2.1.2 (Expo Go compatible)
- Babel bundling error: moved `nativewind/babel` from `plugins` to `presets` (it returns preset format)
- NativeWind styles not applying: added missing `babel.config.js` with `jsxImportSource: 'nativewind'`

### Security
- All storage operations wrapped in try/catch — storage failures are non-fatal throughout
- RevenueCat entitlement check is the single gating point for premium features
- `.env.example` documents all required secrets; actual `.env` is gitignored
- `SECURITY.md` documents data classification, storage rules, and dependency policy
