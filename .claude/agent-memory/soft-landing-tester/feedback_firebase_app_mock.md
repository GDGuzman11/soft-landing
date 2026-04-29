---
name: Mocking the firebase app default export in service tests
description: Service modules import `app` as default from ./firebase; mock that path to avoid initializeApp + EXPO_PUBLIC_* env reads at import time
type: feedback
---

`app-frontend/src/services/firebase.ts` runs `initializeApp(firebaseConfig)` at module-load time and reads `process.env.EXPO_PUBLIC_FIREBASE_*` config. In Vitest those env vars are absent, and pulling in the real firebase app is unnecessary noise for unit tests.

**Why:** Importing a service like `letterService` transitively triggers `firebase.ts` evaluation. Without a mock, every test gets a real (broken) Firebase app instance, and any `getFunctions(app, ...)` / `getAuth(app)` call inside the service receives a malformed app.

**How to apply:** In any test under `app-frontend/src/services/__tests__/**` that imports a service which itself imports `app` from `./firebase`, declare:

```ts
vi.mock('../firebase', () => ({
  default: { name: 'mock-app' },
}))
```

Pair this with a mock of `firebase/functions` (or `firebase/auth`, `firebase/firestore`) where `getFunctions` / `getAuth` / `getFirestore` returns a stub object and the operation factory (`httpsCallable`, etc.) is a `vi.fn()` whose return is set per-test via `mockReturnValue`.
