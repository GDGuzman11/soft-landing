---
name: Vitest setup quirks in app-frontend
description: Where vitest is configured, what its include glob covers, and the mocks already provided in vitest.setup.ts
type: reference
---

`app-frontend/vitest.config.ts` — Vitest config. Note the `include` glob: it matches both `__tests__/**` and `src/**/*.{test,spec}.{ts,tsx}`. If you add a colocated test outside those paths it will silently not run.

`app-frontend/vitest.setup.ts` — provides default mocks for: `@react-native-async-storage/async-storage` (default export with getItem/setItem/etc), `expo-secure-store`, `expo-notifications`, `react-native-purchases` (default export with configure/getCustomerInfo/getOfferings/purchasePackage), `expo-haptics`. Do not redeclare these — extend or override per-test.

Test command from `app-frontend/`:
`pnpm exec vitest run [path/to/file.test.ts]`
