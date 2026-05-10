---
name: Rendering React Native screens in Vitest (node env, no jsdom)
description: How to render an Expo Router screen in the existing Vitest setup without jsdom or @testing-library/react-native
type: feedback
---

The Vitest setup uses `environment: 'node'` with no jsdom, no @testing-library/react-native render path, and no React plugin in the vite config. To render an actual screen (e.g. `app/check-in/emotions.tsx`) you need to:

1. Use `react-test-renderer` directly (`TestRenderer.create(React.createElement(Screen))`). It is installed as a devDependency.
2. Mock `react-native` in the test file. Replace each primitive (`View`, `Text`, `Pressable`, `ImageBackground`, `Animated.View`) with a small functional component that renders a host element with the same name (`React.createElement('View', props, children)`). This makes the tree walkable by string type via `findAll(n => n.type === 'View')`.
3. Mock `react-native-reanimated` with the same host-element trick, plus spy implementations of `withTiming` / `withSpring` / `withRepeat` / `withSequence` / `cancelAnimation` / `runOnJS`. Make `withTiming` invoke its completion callback synchronously so swipe animations advance state in the same tick.
4. Mock `react-native-gesture-handler` with fake `Gesture.Pan()` / `Gesture.Tap()` / `Gesture.Exclusive()` builders that store `__onEnd` / `__onUpdate` callbacks. Pass the gesture object through `GestureDetector` props so tests can grab and invoke the callbacks directly.
5. Spies that need to be referenced inside `vi.mock()` factories MUST be declared inside `vi.hoisted(() => ({ ... }))` — `vi.mock` is hoisted to the top of the file, so plain `const x = vi.fn()` will be a TDZ error.

**Why:** This was the only path that worked without adding jsdom, switching the env, or adding `@vitejs/plugin-react`. Pattern is fully working as of `__tests__/emotions.test.tsx` (8 tests passing).

**How to apply:** Reuse this pattern for any screen-level test. Helpers `findCardWrappers` and `flattenStyle` in that test file are reusable for any test that needs to inspect array-style props.
