# Architecture

Soft Landing is a local-first React Native app built with Expo. There is no backend in V1; all state lives on the device. This document describes the module boundaries, data flow, and the rationale behind the local-first choice — plus the migration path to cloud sync in V2.

## System overview

```
                       ┌──────────────────────────────┐
                       │       Daily local push       │
                       │ (expo-notifications, on-dev) │
                       └──────────────┬───────────────┘
                                      │ user taps
                                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                          Expo Router app                         │
│                                                                  │
│   ┌─────────────┐   ┌─────────────┐   ┌──────────┐  ┌─────────┐  │
│   │ EmotionPick │──▶│ EnvelopeFly │──▶│ Reveal   │─▶│ History │  │
│   │   (cards)   │   │ (Reanimated)│   │ (Lora msg)│ │ (saved) │  │
│   └─────┬───────┘   └─────────────┘   └────┬─────┘  └─────────┘  │
│         │                                   │                    │
│         ▼                                   ▼                    │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │                       lib/ (logic)                         │ │
│   │  storage  │  messages  │  streaks  │  subs  │ notifications│ │
│   └────────────────────────┬───────────────────────────────────┘ │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                ┌────────────┴───────────┐
                ▼                        ▼
        ┌──────────────┐         ┌────────────────┐
        │ AsyncStorage │         │   RevenueCat   │
        │  (local DB)  │         │  (entitlements)│
        └──────────────┘         └────────────────┘
```

## Module map

| Path | Owner | Responsibility |
|---|---|---|
| `app-frontend/app/` | frontend | Expo Router routes — `index.tsx` (emotion picker), `reveal.tsx`, `history.tsx`, `settings.tsx`, `dashboard.tsx` |
| `app-frontend/components/` | frontend | `EmotionCard`, `Envelope`, `MessageReveal`, `StreakBadge`, `Paywall` |
| `app-frontend/hooks/` | frontend | UI hooks — `useEnvelopeFlight`, `useEmotionTheme` |
| `app-frontend/lib/storage/` | data | AsyncStorage adapter, schema versioning, migrations |
| `app-frontend/lib/messages/` | data | Message library JSON, selection algorithm (no repeats within N) |
| `app-frontend/lib/streaks/` | data | Daily streak counter, calendar math, timezone handling |
| `app-frontend/lib/subscriptions/` | security | RevenueCat init, entitlement checks, free-tier gate (3/day) |
| `app-frontend/lib/notifications/` | security | Permission requests, daily reminder scheduling |
| `app-qa/` | tester | Vitest suites, Maestro flows, fixtures |
| `docs/` | docs | This file, DECISIONS, CHANGELOG, bugs.json |

## Data flow — single check-in

1. **Trigger.** User taps the app icon, or taps a daily local notification scheduled by `lib/notifications`.
2. **Gate check.** On mount, `lib/subscriptions.canCheckIn()` reads today's count from `lib/storage` and the active entitlement from RevenueCat. If the user is on free tier and has used 3 today → render `Paywall` instead of the picker.
3. **Emotion picker.** `app/index.tsx` renders the vertical card stack. User taps one → state held in a route param / context.
4. **Message selection.** `lib/messages.pickFor(emotion, history)` returns a message string, biased away from messages shown in the last N check-ins (recorded in storage).
5. **Envelope flight.** `app/reveal.tsx` mounts; `Envelope` runs the Reanimated flight + arrival sequence on the UI thread. The envelope is tinted by the emotion color map from `CLAUDE.md`.
6. **Reveal.** User taps the envelope. `MessageReveal` cross-fades the Lora-rendered message in.
7. **Persist.** `lib/storage.recordCheckIn({ emotion, messageId, timestamp })` writes the entry. `lib/streaks.recompute()` updates the streak.
8. **Return.** User dismisses → back to picker (now possibly gated) or history.

## Local-first rationale

V1 ships with **zero infrastructure**:
- **No accounts.** Friction-free first run; emotional state never leaves the device.
- **No servers.** Nothing to host, monitor, or breach. RevenueCat is the only external service and it never sees emotion data.
- **Offline by default.** The app works on a plane, in a tunnel, anywhere.
- **Faster MVP.** No API contracts, no schema negotiations, no auth flows. We can ship in weeks instead of months.

Cost: no cross-device sync, no analytics on emotion patterns beyond what fits on-device. We accept this for V1.

## Subscription architecture

RevenueCat is the source of truth for entitlements. The app never talks to App Store Connect or Google Play Billing directly.

- **Entitlement name:** `premium`
- **Free tier:** 3 check-ins per local day (rolls over at device midnight). Counter lives in AsyncStorage, keyed by ISO date.
- **Premium tier:** unlimited check-ins, full history view, future themes.
- **Products:** `softlanding_monthly` ($4.99 USD) and `softlanding_annual` ($34.99 USD).
- **Gating point:** `lib/subscriptions.canCheckIn()` is the single chokepoint. UI calls it before rendering the picker; tests assert the gate is honored.
- **Restore purchases:** required by both stores — exposed in Settings.
- **Receipt validation:** delegated to RevenueCat (server-side). The app trusts RevenueCat's `customerInfo` response.

## Future migration path — V1 → V2 cloud sync

V2 introduces optional cloud sync (opt-in, e2e-encrypted check-in history across devices). To make this painless:

1. **Storage adapter.** `lib/storage` exposes a narrow async interface. The current implementation is AsyncStorage-backed; a future `RemoteSyncAdapter` will satisfy the same interface and queue writes when offline.
2. **Schema versioning.** Every persisted record has a `schemaVersion` field. Migrations live in `lib/storage/migrations/` and run on app launch.
3. **No PII at rest.** Even in V1, we avoid storing identifying info — only emotion + timestamp + messageId. This keeps V2 encryption scope small.
4. **`app-backend/` is reserved.** When V2 starts, the backend agent owns it; the storage adapter is the only frontend surface that changes.

## Dev dashboard

A web-only inspector at `app-frontend/app/dashboard.tsx`, owned by the tester agent. It runs only when launched via `expo start --web` and is excluded from production builds via a route guard checking `__DEV__`.

Surfaces:
- **Emotion picker preview** — render every card state side by side
- **Message library coverage** — counts per emotion, recently-shown list
- **Streak math** — paste a check-in history, see computed streak
- **Subscription mocks** — toggle `free` / `premium`, override today's count
- **Bug tracker view** — read-only render of `docs/bugs.json`

The dashboard is a development convenience and is never shipped to the App Store or Play Store.

## Bug schema

`docs/bugs.json` follows this `Bug` interface:

```ts
interface Bug {
  id: string;                // "BUG-001" sequential
  discovered: string;        // ISO 8601 date
  discoveredBy: string;      // agent name: frontend | data | security | tester | docs
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "resolved" | "wont-fix";
  area: "frontend" | "data" | "security" | "ux" | "notifications" | "subscriptions";
  description: string;
  file?: string;             // path relative to repo root
  reproductionSteps: string[];
  commit?: string;           // commit sha that fixed it
  resolution?: string;
  resolvedAt: string | null;
}
```

All agents append to `bugs` immediately on discovery — do not wait for a triage cycle.
