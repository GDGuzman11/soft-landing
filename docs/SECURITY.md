# Security Policy — Soft Landing

## Data Classification

Mood selections, prayer input, and AI letter content are health-adjacent personal data.
They must be handled with the same care as sensitive PII.

| Data | Classification | Storage | Leaves Device |
|---|---|---|---|
| Emotion selections | Sensitive | AsyncStorage | No |
| Check-in history | Sensitive | AsyncStorage | No |
| Saved messages + letters | Sensitive | AsyncStorage | No |
| User prayer input ("What's on your heart?") | Sensitive | Ephemeral | Yes — sent to Firebase Function, then discarded server-side |
| App settings | Non-sensitive | AsyncStorage | No |
| Subscription state cache | Financial | AsyncStorage | No |
| RevenueCat purchase receipts | Financial | RevenueCat SDK | Yes — RC servers only |

**AI Letter pipeline note:** User input typed on the letter-compose screen is sent to the `generateLetter` Cloud Function, passed to the Claude Sonnet 4.6 API for letter generation, and then discarded. It is not logged, stored in Firestore, or retained on any server after the response is returned. Users are informed of this via an in-app disclosure on the letter-compose screen.

## Storage Rules

- **AsyncStorage**: Used for check-in history, saved messages, and app settings.
  Not encrypted by default on device. Acceptable for the current local-first scope.
  If cloud sync is added in V2, all mood data must be encrypted in transit and at rest.
- **expo-secure-store**: Reserved for any future token or entitlement cache requiring hardware-backed encryption.
- **No plaintext secrets**: API keys and tokens go in `.env` (never committed).
  See `.env.example` for required variables.
- **Firebase Secret Manager**: `ANTHROPIC_API_KEY` is stored in Firebase Secret Manager, not in environment variables or the Firebase console. It is declared in the `onCall()` `secrets` option so Cloud Functions can access it at runtime without exposing it in any config surface.

## Notification Security

Push and local notification payloads must **not** contain mood data,
message body text, or any user-identifiable content.
Payloads are limited to: app name, generic prompt text, and routing metadata.

## Input Security Pipeline

All user input that reaches the `generateLetter` Cloud Function is run through a multi-layer validation pipeline before reaching the Claude API:

1. **Schema validation** — emotionId, reference, userName, hourOfDay, faithBackground, lifeStage validated against strict allowed-value enums. Length limits enforced on all string fields.
2. **Injection filtering** (`inputFilter.ts`) — blocks SQL injection, NoSQL injection, prompt injection (including jailbreak patterns, role hijacking, system tag injection, fictional wrappers), code injection (script tags, eval, DOM access), and path traversal.
3. **Obfuscation normalization** (`textNormalizer.ts`) — normalizes leet speak, Unicode homoglyphs (Cyrillic/Greek), zero-width characters, deliberate spacing, and base64/ROT13 encoding before pattern matching.
4. **Crisis detection** (`crisisKeywords.ts`) — 114 phrases across categories (explicit self-harm, coded language, hopelessness, goodbye language, planning language). If flagged, the function returns `{ letter: null, showCrisisPrompt: true }` — letter is never generated. UI shows crisis hotline resources (988, Crisis Text Line 741741).

## Rate Limiting

The `generateLetter` Cloud Function enforces a per-user rate limit using a Firestore transactional counter:
- **Limit:** 20 letter generations per 1-hour rolling window per authenticated user
- **Storage:** `letterUsage/{uid}` in Firestore — accessible only by the owning user (security rules enforced)
- **On limit exceeded:** returns `{ rateLimited: true }` with appropriate HttpsError

## Authentication Requirements

- The `generateLetter` Cloud Function requires a valid Firebase Auth JWT (`request.auth` check). Unauthenticated calls are rejected with `HttpsError('unauthenticated')`.
- Guest users cannot generate AI letters — tapping "Write Letter" as a guest prompts account creation.

## Firestore Security Rules

Deny-all by default. Only `letterUsage/{uid}` is accessible, and only by the authenticated owner:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /letterUsage/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Subscription / RevenueCat

- Client-side entitlement state is a **cache only** — never the source of truth.
- All purchase decisions must be validated server-side via RevenueCat webhooks before granting premium access.
- The RevenueCat SDK keys (`EXPO_PUBLIC_REVENUECAT_*`) are public-safe by design but must be scoped to this app's bundle ID in the RC dashboard.
- The `canUseLetter` gate in `letter-compose.tsx` is currently bypassed for testing (`const canUseLetter = true`). **This must be re-enabled before App Store submission.**

## Dependency Policy

- Prefer Expo-managed or Expo-blessed packages to reduce native attack surface.
- Run `pnpm audit` (frontend) and `npm audit` (backend functions) before each release. Critical or high CVEs block release.
- Pin major versions. Review changelogs before upgrading.

## Analytics & Tracking

- No analytics collected.
- If analytics are added in a future version, explicit user consent and a privacy disclosure are required before any data is collected.

## Known Risks

| Risk | Severity | Mitigation |
|---|---|---|
| AsyncStorage is unencrypted | Medium | Local-only scope, no PII beyond mood + saved text |
| `canUseLetter = true` bypasses premium gate | High | Must be reverted before launch (see pre-launch checklist) |
| `canCheckIn()` bypass active | High | Must be reverted before launch |
| Cloud Run `generateletter` allows public invoker | High | Must be locked down before launch |
| Firebase credentials in git history | Critical | Must rotate all credentials before launch |
| react-native-purchases native module | Low | Audit on each SDK upgrade |

## Pre-Launch Security Checklist

- [ ] Rotate all Firebase credentials (were committed to git history)
- [ ] Move Cloud Run `generateletter` to require authentication (not `invoker: 'public'`)
- [ ] Re-enable `canUseLetter` gate in `letter-compose.tsx`
- [ ] Re-enable `canCheckIn()` in `checkIn.ts`
- [ ] Restrict iOS API key to bundle ID `com.softlanding.app` in Google Cloud Console
- [ ] Enable Firebase App Check for Cloud Functions
- [ ] Set Google Cloud billing alert at $30/month
- [ ] `pnpm audit` + `npm audit` clean before submission

## Reporting a Vulnerability

Open a private GitHub Security Advisory at:
https://github.com/GDGuzman11/soft-landing/security/advisories/new
