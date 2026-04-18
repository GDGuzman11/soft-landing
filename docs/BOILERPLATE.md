# Reusable App Boilerplate

This stack is battle-tested from Soft Landing. Copy it to start any new
React Native app with subscriptions, local storage, animations, and CI
already wired up.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo (managed) | No Xcode/Android Studio needed to start |
| Navigation | Expo Router | File-based routes, works with web too |
| Styling | NativeWind v4 | Tailwind utilities in React Native |
| Animations | React Native Reanimated | UI-thread, 60fps, no jank |
| Local storage | AsyncStorage v2.x | Simple key-value, works in Expo Go |
| Subscriptions | RevenueCat | Cross-platform, server-validated |
| Fonts | expo-google-fonts | No manual asset linking |
| Haptics | expo-haptics | One-line feedback on any interaction |
| Build | EAS Build | Cloud builds, no Mac needed for iOS |
| CI | GitHub Actions | tsc + vitest + expo export on every push |
| Package manager | pnpm | Faster than npm, strict hoisting |

---

## Folder structure to copy

```
my-app/
├── app-frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx       ← Tab bar config
│   │   │   ├── index.tsx         ← Home tab
│   │   │   ├── history.tsx       ← Second tab
│   │   │   └── settings.tsx      ← Settings tab
│   │   ├── _layout.tsx           ← Root layout, font loading
│   │   ├── onboarding.tsx        ← First-run flow
│   │   └── paywall.tsx           ← Subscription gate
│   ├── src/
│   │   ├── constants/
│   │   │   ├── index.ts          ← Barrel export + FREE_LIMIT constant
│   │   │   └── theme.ts          ← Colors, typography, spacing, animation
│   │   ├── messages/
│   │   │   ├── catalog.json      ← Your content (replace with your own)
│   │   │   └── selector.ts       ← Weighted random with anti-repetition
│   │   ├── services/
│   │   │   ├── checkIn.ts        ← Core action service (adapt to your domain)
│   │   │   └── revenuecat.ts     ← RevenueCat init + entitlement check
│   │   ├── storage/
│   │   │   └── storage.ts        ← Typed AsyncStorage wrappers
│   │   ├── types/
│   │   │   └── index.ts          ← All TypeScript interfaces
│   │   └── utils/
│   │       └── id.ts             ← generateId() — no uuid dependency needed
│   ├── assets/
│   │   └── images/               ← icon.png, splash-icon.png, adaptive-icon.png
│   ├── app.json                  ← Expo config + EAS projectId
│   ├── eas.json                  ← Build profiles: development/preview/production
│   ├── babel.config.js           ← NativeWind preset (don't skip this)
│   ├── metro.config.js           ← withNativeWind wrapper
│   ├── tailwind.config.js        ← Colors, fonts, dark mode tokens
│   ├── global.css                ← @tailwind base/components/utilities
│   ├── tsconfig.json             ← strict mode + @/* path alias
│   └── .npmrc                    ← shamefully-hoist=true for pnpm
├── .env.example                  ← Document every credential here
├── .gitignore                    ← Includes .env, *.p8, *.p12, google-service-account.json
├── .github/
│   └── workflows/
│       └── ci.yml                ← tsc + vitest + expo export
└── docs/
    ├── CREDENTIALS.md            ← How to get every key (see template below)
    └── CHANGELOG.md              ← Keep a Changelog format
```

---

## Files to copy verbatim (change nothing)

These files work for any Expo app with NativeWind — copy them unchanged:

- `babel.config.js`
- `metro.config.js`
- `global.css`
- `.npmrc`
- `tsconfig.json` (update paths if needed)
- `src/utils/id.ts`
- `.github/workflows/ci.yml` (update working-directory if needed)
- `.gitignore`

---

## Files to adapt

**`tailwind.config.js`** — swap out the color tokens for your brand:
```js
colors: {
  background: '#YOUR_BG',
  accent: '#YOUR_ACCENT',
  // keep surface, text-primary, text-secondary, border pattern
}
```

**`src/types/index.ts`** — replace domain types (Emotion, Message, CheckInEvent)
with your app's domain. Keep AppSettings, SubscriptionState, NotificationPreference.

**`src/constants/theme.ts`** — update COLORS, keep ANIMATION and LIMITS structure.

**`app.json`** — update name, slug, bundleIdentifier, package, then run `eas init`.

**`eas.json`** — build profiles are reusable as-is. Add submit section when ready.

---

## Critical setup steps (in order)

```bash
# 1. Create the project
mkdir my-app && cd my-app
npx create-expo-app@latest app-frontend --template tabs

# 2. Install the stack
cd app-frontend
pnpm add nativewind tailwindcss react-native-reanimated
pnpm add expo-haptics expo-router expo-splash-screen
pnpm add @expo-google-fonts/dm-sans @expo-google-fonts/lora
pnpm add @react-native-async-storage/async-storage@~2.1.2
pnpm add react-native-purchases   # RevenueCat

# 3. Copy config files
# babel.config.js, metro.config.js, global.css, tailwind.config.js

# 4. Link EAS
npm install -g eas-cli
eas login
eas init

# 5. Add credentials
cp .env.example .env
# Fill in EXPO_PUBLIC_REVENUECAT_IOS_KEY and ANDROID_KEY
```

---

## RevenueCat initialization (wire this up before shipping)

```ts
// src/services/revenuecat.ts
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { Platform } from 'react-native'

export function initRevenueCat() {
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG)

  const key = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!

  Purchases.configure({ apiKey: key })
}

export async function getSubscriptionTier(): Promise<'free' | 'premium'> {
  try {
    const info = await Purchases.getCustomerInfo()
    return info.entitlements.active['premium'] ? 'premium' : 'free'
  } catch {
    return 'free'
  }
}
```

Call `initRevenueCat()` in your root `_layout.tsx` before rendering.

---

## What to replace for a new app

| Item | What to change |
|---|---|
| `src/messages/catalog.json` | Your content (articles, prompts, quotes, exercises) |
| `src/constants/emotions.ts` | Your categories or remove entirely |
| Emotion colors | Your brand palette |
| Free tier limit | `FREE_CHECKINS_PER_DAY` constant in `src/constants/index.ts` |
| Subscription products | Product IDs in RevenueCat + App Store Connect |
| App name / bundle ID | `app.json` + `eas.json` |
| Fonts | Swap DM Sans / Lora for your typeface in `_layout.tsx` + `tailwind.config.js` |

---

## The pattern that makes this work

Every screen follows the same three-layer pattern:

```
Screen (app/)
  └── calls Service (src/services/)
        └── calls Storage (src/storage/) ← always try/catch
              └── AsyncStorage
```

Storage failures are always caught and return safe defaults.
Services are always the single entry point — screens never touch AsyncStorage directly.
Navigation never waits on storage — it fires and forgets.
