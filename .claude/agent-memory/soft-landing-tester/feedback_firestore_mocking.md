---
name: Mocking firebase/firestore in selector tests
description: The two non-obvious mocks required to test src/messages/selector.ts in a node Vitest environment
type: feedback
---

When testing modules that import from `../services/firebase`, mock the firebase service module itself, not just `firebase/firestore`.

**Why:** `app-frontend/src/services/firebase.ts` runs `initializeApp(firebaseConfig)` at import time. In the node Vitest environment the `EXPO_PUBLIC_FIREBASE_*` env vars are undefined, so initialization fails or initializes a broken app, polluting downstream tests. Mock with `vi.mock('../services/firebase', () => ({ db: {} }))`.

**How to apply:** Any test that imports a module which transitively imports from `../services/firebase` (selector, letter-compose, anything reading from Firestore). Pair it with `vi.mock('firebase/firestore', () => ({ collection, query, where, getDocs }))` where each is `vi.fn()`.

**Snapshot shape:** `getDocs` returns a QuerySnapshot whose `forEach((doc) => …)` is called by selector — mock as a plain object `{ forEach(cb) { docs.forEach(cb) } }`, not an array or async iterable. Each doc must expose `id: string` and `data(): VerseDoc`.
