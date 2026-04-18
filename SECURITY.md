# Security Policy — Soft Landing

## Data Classification

Mood selections and message history are health-adjacent personal data.
They must be handled with the same care as sensitive PII.

| Data | Classification | Storage | Leaves Device |
|---|---|---|---|
| Emotion selections | Sensitive | AsyncStorage | No (V1) |
| Check-in history | Sensitive | AsyncStorage | No (V1) |
| Saved messages | Sensitive | AsyncStorage | No (V1) |
| App settings | Non-sensitive | AsyncStorage | No (V1) |
| Subscription state cache | Financial | expo-secure-store | No |
| RevenueCat purchase receipts | Financial | RevenueCat SDK | Yes — RC servers only |

## Storage Rules

- **AsyncStorage**: Used for check-in history, saved messages, and app settings.
  Not encrypted by default on device. Acceptable for V1 local-only app.
  If cloud sync is added in V2, all mood data must be encrypted in transit and at rest.
- **expo-secure-store**: Used for any token or cached entitlement state.
  Hardware-backed encryption on supported devices.
- **No plaintext secrets**: API keys and tokens go in `.env` (never committed).
  See `.env.example` for required variables.

## Notification Security

Push and local notification payloads must **not** contain mood data,
message body text, or any user-identifiable content.
Payloads are limited to: app name, generic prompt text, and routing metadata.

## Subscription / RevenueCat

- Client-side entitlement state is a **cache only** — never the source of truth.
- All purchase decisions must be validated server-side via RevenueCat webhooks
  before granting premium access.
- The RevenueCat SDK keys (`EXPO_PUBLIC_REVENUECAT_*`) are public-safe by design
  but must be scoped to this app's bundle ID in the RC dashboard.

## Dependency Policy

- Prefer Expo-managed or Expo-blessed packages to reduce native attack surface.
- Run `pnpm audit` before each release. Critical or high CVEs block release.
- Pin major versions. Review changelogs before upgrading.

## Analytics & Tracking

- No analytics collected in V1.
- If analytics are added in a future version, explicit user consent and
  a privacy disclosure are required before any data is collected.

## Known Risks (V1)

- AsyncStorage is unencrypted — mitigated by local-only scope and no PII beyond mood
- react-native-purchases adds a native module — audit on each SDK upgrade
- No auth in V1 — single-user local app, no account compromise vector

## Reporting a Vulnerability

Open a private GitHub Security Advisory at:
https://github.com/GDGuzman11/soft-landing/security/advisories/new
