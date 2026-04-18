# Soft Landing

A premium emotional check-in mobile app for iOS and Android. Open the app, pick how you feel, tap the cream envelope that flies in, and read a short, human-sounding validating message. Local-first; no account required.

Built with React Native + Expo, TypeScript strict, NativeWind, and React Native Reanimated.

## Prerequisites

- **Node 20** (use `nvm` / `volta` / `fnm` to pin)
- **pnpm** (`npm install -g pnpm`)
- **Expo CLI** (`pnpm add -g expo`)
- iOS Simulator (Xcode) or Android Emulator (Android Studio) for device testing — the dev dashboard runs in the browser without either

## Setup

```bash
git clone <repo-url> soft-landing
cd soft-landing
pnpm install
cp .env.example .env        # fill in RevenueCat keys when available
pnpm --filter app-frontend exec expo start
```

Press `i` for iOS, `a` for Android, `w` for the web dev dashboard.

## Project structure

```
soft-landing/
├── app-frontend/      # Expo app — screens, components, hooks, lib (owned by frontend/data/security/tester)
├── app-backend/       # reserved for V2 cloud sync — unused in V1
├── app-qa/            # Vitest suites + Maestro end-to-end flows
└── docs/              # ARCHITECTURE, DECISIONS, CHANGELOG, bugs.json
```

The mobile app lives entirely under `app-frontend/`. Inside it, `lib/storage`, `lib/messages`, `lib/streaks`, `lib/subscriptions`, and `lib/notifications` are split among the data, security, and tester agents — see [`CLAUDE.md`](./CLAUDE.md) for the exact ownership map.

## Running tests

```bash
pnpm test                                  # Vitest unit + integration suites
pnpm --filter app-qa exec maestro test .   # Maestro end-to-end flows (requires a running emulator)
```

## Dev dashboard

A browser-only inspector for emotion picker states, message library coverage, streak math, and subscription mocks.

```bash
pnpm --filter app-frontend exec expo start --web
```

Then open `http://localhost:8081/dashboard`.

## Environment variables

Secrets and keys are not committed. See [`.env.example`](./.env.example) for the full list (RevenueCat public key, dev-only feature flags). The security agent owns this file.

## Agent team

This project is built collaboratively by a five-agent team — **frontend**, **data**, **security**, **tester**, and **docs**. Each agent owns a non-overlapping slice of the repo. See [`CLAUDE.md`](./CLAUDE.md) for the ownership map and commit conventions before opening a PR.
