---
name: __DEV__ global shim in service tests
description: Service modules reference __DEV__ in catch/dev-log branches; Vitest node env does not define it, so error-path tests must shim it
type: feedback
---

When testing any module under `app-frontend/src/services/**` that has a `try/catch` with `if (__DEV__) console.error(...)` (e.g. `letterService.ts`), the catch path will throw a `ReferenceError: __DEV__ is not defined` under Vitest's node environment, masking the actual error-handling logic being tested.

**Why:** `__DEV__` is a React Native / Metro bundler global. The project's `vitest.setup.ts` does not declare it, and `vitest.config.ts` uses `environment: 'node'` (not jsdom + RN preset).

**How to apply:** At the top of any test file that exercises an error path through a service module, add:

```ts
;(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false
```

Setting it to `false` keeps test output clean (no spurious console.error from the dev-only log). If you ever need to verify that the dev log fires, flip to `true` and spy on `console.error`.
