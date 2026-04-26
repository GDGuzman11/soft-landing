# Architecture — Soft Landing v1.4

Soft Landing is a hybrid React Native app: local-first for all user data, with a Firebase Cloud Function backend for AI letter generation. This document describes the module structure, data flow, security boundaries, and the rationale behind key design decisions.

## System overview

```
                ┌──────────────────────────────────────────────────┐
                │                   Expo Router app                │
                │                                                  │
                │  Welcome → Onboarding → Profile → Faith Intro    │
                │         ↓                                        │
                │  Home → Emotions → Envelope → Message (swipe)    │
                │         ↓                                        │
                │  Session Summary → Letter Compose                │
                │         ↓                                        │
                │  History tab ← Saved messages + letters          │
                └──────────────────────────────────────────────────┘
                         │                      │
              ┌──────────┘                      └───────────────────┐
              ▼                                                      ▼
   ┌──────────────────────┐              ┌────────────────────────────────┐
   │     AsyncStorage     │              │    Firebase (Google Cloud)     │
   │  (all local data)    │              │                                │
   │  - AppSettings       │              │  Firebase Auth                 │
   │  - CheckInEvents     │              │  (email/password + Google)     │
   │  - SavedMessages     │              │                                │
   │  - MessageMetadata   │              │  Cloud Functions v2             │
   └──────────────────────┘              │  generateLetter (onCall)       │
                                         │  → Claude Sonnet 4.6           │
              ┌──────────────────────┐   │                                │
              │      RevenueCat      │   │  Firestore                     │
              │  (entitlements only) │   │  letterUsage/{uid}             │
              └──────────────────────┘   │  (rate-limit counter)          │
                                         └────────────────────────────────┘
```

## Screen map

| Route | File | Description |
|---|---|---|
| `/welcome` | `app/welcome.tsx` | App entry — cross animation, Create Account / Sign In / How It Works |
| `/register` | `app/register.tsx` | Email/password + Google sign-up |
| `/sign-in` | `app/sign-in.tsx` | Email/password + Google sign-in |
| `/verify-email` | `app/verify-email.tsx` | Post-registration — checks verification, resend link |
| `/onboarding-disclaimer` | `app/onboarding-disclaimer.tsx` | Legal disclaimer, requires explicit tap-through |
| `/onboarding` | `app/onboarding.tsx` | 2-slide intro (what the app does) |
| `/onboarding-profile` | `app/onboarding-profile.tsx` | 3-question profile: faith background, intent, life stage |
| `/faith-intro` | `app/faith-intro.tsx` | One-time faith-context intro screen before home |
| `/(tabs)` | `app/(tabs)/index.tsx` | Home — greeting, check-in button, streak/history hint |
| `/(tabs)/history` | `app/(tabs)/history.tsx` | Saved verses + letters |
| `/(tabs)/settings` | `app/(tabs)/settings.tsx` | Name, subscription, notifications, sign out |
| `/check-in/emotions` | `app/check-in/emotions.tsx` | Emotion picker — 5 full-width cards |
| `/check-in/envelope` | `app/check-in/envelope.tsx` | Sealed card with wax seal, spring fly-in, tap to open |
| `/check-in/message` | `app/check-in/message.tsx` | Verse reveal + swipe flow (right=save, left=skip) |
| `/check-in/session-summary` | `app/check-in/session-summary.tsx` | Post-session — shows saved verses, entry to letter compose |
| `/check-in/letter-compose` | `app/check-in/letter-compose.tsx` | AI letter: verse + optional input → generates letter |
| `/paywall` | `app/paywall.tsx` | Premium upgrade — monthly / annual |
| `/tour` | `app/tour.tsx` | "How It Works" editorial guide for guest visitors |

## Module map

| Path | Owner | Responsibility |
|---|---|---|
| `app-frontend/app/` | frontend | All Expo Router routes (see screen map above) |
| `app-frontend/src/components/` | frontend | `LetterCard`, `TourTooltip`, `EmotionCard`, `Envelope` |
| `app-frontend/src/services/auth.ts` | frontend | Firebase Auth wrapper — signUp, signIn, Google, signOut, resetPassword |
| `app-frontend/src/services/letterService.ts` | frontend | Firebase httpsCallable wrapper for `generateLetter` |
| `app-frontend/src/services/checkIn.ts` | data | `canCheckIn()`, `performCheckIn()`, `bookmarkMessage()` |
| `app-frontend/src/services/purchases.ts` | security | RevenueCat SDK init |
| `app-frontend/src/storage/storage.ts` | data | AsyncStorage adapter — all typed read/write helpers |
| `app-frontend/src/messages/catalog.json` | data | 150 NIV verses — 30 per emotion, 15 free / 15 premium each |
| `app-frontend/src/messages/selector.ts` | data | Weighted verse selection with anti-repetition penalty |
| `app-frontend/src/types/index.ts` | data | All shared TypeScript types |
| `app-backend/functions/src/generateLetter.ts` | security | Firebase onCall function — auth, rate limiting, input validation, crisis detection, Claude call |
| `app-backend/functions/src/prompt.ts` | security | 4-layer prompt builder — questionnaire + emotion + verse + user input |
| `app-backend/functions/src/inputFilter.ts` | security | Multi-layer injection filter (SQL, NoSQL, prompt injection, code injection, obfuscation) |
| `app-backend/functions/src/textNormalizer.ts` | security | Normalizes leet speak, Unicode homoglyphs, zero-width chars before pattern matching |
| `app-backend/functions/src/crisisKeywords.ts` | security | 114 crisis phrases — if matched, returns `{ letter: null, showCrisisPrompt: true }` |
| `app-backend/firestore.rules` | security | Deny-all rules; only `letterUsage/{uid}` accessible by owner |
| `app-qa/` | tester | Vitest suites, Maestro flows |
| `docs/` | docs | ARCHITECTURE, SECURITY, CHANGELOG, DECISIONS, bugs.json |

## Data flow — check-in to letter

```
1. Auth check
   Home screen → canCheckIn() checks daily quota from AsyncStorage
   Free tier limit: 10 check-ins/day (rolls over at device midnight)

2. Emotion selection
   /check-in/emotions → 5 emotion cards → user taps one
   emotionId carried forward as route param

3. Verse selection
   selector.ts runs weighted selection filtered by emotionId
   Anti-repetition: usageCount + lastUsed stored in messageMetadata
   Premium verses (ids 16-30) gated by subscription tier

4. Envelope open
   /check-in/envelope → wax seal pulse → spring animation → navigate

5. Verse reveal + swipe flow
   /check-in/message → verse displays → swipe right=save, swipe left=skip
   Saved verses → bookmarkMessage() → AsyncStorage SavedMessages

6. Session summary
   /check-in/session-summary → shows verses saved this session
   "Write a letter →" per verse

7. Letter generation (server-side)
   /check-in/letter-compose → optional user input → handleSend()
   → generateLetter Firebase callable
   → auth check (request.auth)
   → rate limit check (Firestore letterUsage/{uid}, max 20/hr)
   → input validation (schema + injection filter + normalizer)
   → crisis check (114 phrases) → if flagged: { letter: null, showCrisisPrompt: true }
   → buildPrompt() (4-layer personalization)
   → Claude Sonnet 4.6 → letter string with [[resonant line]] markers
   → returned to client, auto-saved to AsyncStorage
```

## AI letter — 4-layer prompt personalization

The `buildPrompt()` function in `prompt.ts` assembles context in this priority order:

| Layer | Source | What it does |
|---|---|---|
| 1 — Questionnaire | `faithBackground`, `lifeStage`, `primaryIntent` from AppSettings | Sets base tone and voice — answered once at registration, permanent context |
| 2 — Emotion | `emotionId` | Defines paragraph arc — each emotion has different goals for all 3 paragraphs |
| 3 — Verse | `verseBody`, `reference` | Content anchor — Claude must engage with the verse's specific words, not just acknowledge it exists |
| 4 — User input | `userInput` (optional) | Highest-specificity shaping — if present, first paragraph addresses it directly |

**Resonant line highlighting**: Claude wraps the single most emotionally resonant sentence it wrote in `[[double brackets]]`. The frontend strips these for the typewriter pass, then after typing completes, re-parses the original string to render that sentence with a 2px amber left border rule (fades in 600ms post-typing).

**Opening variation**: A random angle is selected from 7 opening strategies each call — ensures no two letters open the same way.

## Input security pipeline

All user-submitted text passes through these layers before reaching Claude:

1. **Schema validation** — field types, lengths, allowed enums enforced server-side
2. **Injection filtering** (`inputFilter.ts`) — blocks SQL/NoSQL/prompt injection, jailbreak patterns, code injection, path traversal
3. **Obfuscation normalization** (`textNormalizer.ts`) — normalizes leet speak, Unicode homoglyphs, zero-width characters, base64/ROT13 before pattern matching
4. **Crisis detection** (`crisisKeywords.ts`) — 114 phrases; if matched → no letter generated, crisis resources returned to UI

## Authentication architecture

Firebase Auth is the identity layer. Token verification is automatic via Firebase's `onCall()` — no manual JWT parsing needed.

- **Persistence**: `getReactNativePersistence(AsyncStorage)` — tokens survive cold restarts
- **Email/password**: standard Firebase Auth with email verification gate
- **Google Sign-In**: `expo-auth-session` → `GoogleAuthProvider.credential()` → `signInWithCredential()`
- **Guest mode**: `isGuest: true` in AppSettings — guests can check in but cannot generate AI letters (prompts account creation)
- **Auth-aware navigation**: Home screen `useEffect` fires on auth state change, routes to appropriate onboarding step based on flags in AppSettings

## AppSettings schema

All user preferences live in a single AsyncStorage object at key `@soft_landing/settings`:

```typescript
interface AppSettings {
  name: string
  email: string
  isGuest: boolean
  onboardingComplete: boolean
  disclaimerAccepted: boolean
  faithIntroComplete: boolean
  profileComplete: boolean
  firstLetterUsed: boolean
  faithBackground: 'established' | 'exploring' | 'between' | null
  primaryIntent: 'peace' | 'strength' | 'comfort' | 'guidance' | 'exploring' | null
  lifeStage: 'early' | 'middle' | 'later' | null
  subscription: SubscriptionState          // tier, expiresAt, source
  hapticFeedback: boolean
  notificationEnabled: boolean
  notificationTime: string                 // 'HH:mm' local time
}
```

## Subscription architecture

RevenueCat is the source of truth for entitlements. The app never calls App Store Connect or Play Billing directly.

- **Entitlement name:** `premium`
- **Free tier:** 10 check-ins/day (daily counter resets at device midnight); 1 free AI letter (tracked via `firstLetterUsed`)
- **Premium tier:** Unlimited check-ins, all 150 verses, unlimited AI letters
- **Products:** `softlanding_monthly` ($4.99/month), `softlanding_annual` ($34.99/year)
- **Client-side state is cache only** — `canUseLetter` gate (currently bypassed for testing) must be re-enabled before launch; purchase validation is server-side via RevenueCat

## Rate limiting

`generateLetter` enforces per-user rate limiting using a Firestore transactional counter:

- **Limit:** 20 letter generations per rolling 1-hour window per authenticated UID
- **Storage:** `letterUsage/{uid}` — readable/writable only by the authenticated owner (Firestore rules enforced)
- **On limit exceeded:** `HttpsError('resource-exhausted')` → client shows `rateLimited` error message

## Firebase infrastructure

| Service | Use | Notes |
|---|---|---|
| Firebase Auth | User identity | Email/password + Google |
| Cloud Functions v2 | `generateLetter` | `us-central1`, `onCall`, `secrets: ['ANTHROPIC_API_KEY']` |
| Firestore | Rate limit counters | `letterUsage/{uid}` only; deny-all rules for everything else |
| Secret Manager | `ANTHROPIC_API_KEY` | Injected at runtime via `secrets` option — never in env vars or console |
| Cloud Run | Managed by Functions v2 | Must be locked to require authentication before App Store submission |

## Bug schema

`docs/bugs.json` follows this `Bug` interface:

```typescript
interface Bug {
  id: string;                // "BUG-001" sequential
  discovered: string;        // ISO 8601 date
  discoveredBy: string;      // agent name
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "resolved" | "wont-fix";
  area: "frontend" | "data" | "security" | "ux" | "notifications" | "subscriptions";
  description: string;
  file?: string;
  reproductionSteps: string[];
  commit?: string;
  resolution?: string;
  resolvedAt: string | null;
}
```

All agents append to `bugs` immediately on discovery.
