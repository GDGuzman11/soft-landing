# Soft Landing

A premium emotional check-in mobile app. The user opens the app, picks an emotion (stressed / tired / sad / neutral / good), a cream envelope flies in, they tap to open it, and they receive a short human-sounding validating message.

## Current phase
**Phase 0** — foundation. Repo skeleton, agent ownership map, base documentation, bug tracker, design tokens.

## Stack summary
- React Native via **Expo** (managed workflow)
- **Expo Router** for file-based navigation
- **TypeScript** in strict mode
- **NativeWind v4** (Tailwind for React Native)
- **React Native Reanimated** (UI-thread animations, no Lottie)
- **AsyncStorage** for local persistence (local-first, no backend in V1)
- **RevenueCat** for subscriptions ($4.99/month or $34.99/year, 3 free check-ins per day)
- **Vitest** for unit tests, **Maestro** for end-to-end flows
- **pnpm** + **Node 20**

## Agent team roster — file ownership
Every file is owned by exactly one agent. Agents must not edit files outside their list.

| Agent | Owns |
|---|---|
| **frontend** | `app-frontend/**` (screens, components, navigation, animations, NativeWind config, Expo Router routes) |
| **data** | `app-frontend/lib/storage/**`, `app-frontend/lib/messages/**`, `app-frontend/lib/streaks/**`, AsyncStorage schemas, message library JSON |
| **security** | `app-frontend/lib/subscriptions/**` (RevenueCat integration, entitlement checks), `app-frontend/lib/notifications/**`, `.env.example`, secret-handling utilities |
| **tester** | `app-qa/**` (Vitest suites, Maestro flows), `app-frontend/**/*.test.ts(x)` colocated tests, dev dashboard at `app-frontend/app/dashboard.tsx` |
| **docs** | `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/bugs.json` |

`app-backend/` is reserved but unused in V1.

## Bug tracker
**Location:** `docs/bugs.json`

**Rule:** every agent adds a bug to `docs/bugs.json` immediately upon discovery — do not defer, do not wait for triage. Use the `Bug` schema documented in that file's surrounding tooling and in `docs/ARCHITECTURE.md`. IDs are sequential `BUG-001`, `BUG-002`, …

## Commit format
Conventional Commits. Allowed prefixes:
- `feat:` new user-visible feature
- `fix:` bug fix
- `docs:` documentation only
- `test:` test code only
- `chore:` tooling, deps, repo plumbing
- `security:` anything touching subscription gating, secrets, permissions, or RevenueCat

One agent's work per commit. Reference a bug ID in the body when relevant (e.g. `closes BUG-014`).

## Key design decisions
- **Name:** Soft Landing — chosen for warmth and the metaphor of being caught
- **Palette:** warm off-white background `#FAF8F5`, amber accent `#C4956A`
- **Fonts:** **DM Sans** for UI clarity, **Lora** for the validating message itself (warmth, serif intimacy)
- **Emotion color map** (envelope tint and accent per state):
  - `stressed` — muted clay `#C97B5A`
  - `tired` — dusty lavender `#9C8FB5`
  - `sad` — soft slate blue `#7A95B0`
  - `neutral` — warm sand `#C4B59A`
  - `good` — gentle sage `#9CB59A`
- **Interaction model:** vertical card stack for the emotion picker (deliberate, not a rushed grid), Reanimated envelope flight, single tap to open

## Active context
*Session 2026-04-17 — Phase 0 kickoff. Docs agent is establishing foundation files. No app code exists yet; other agents are scaffolding their own areas in parallel. Update this section at the start of each session with current focus and any cross-agent coordination items.*
