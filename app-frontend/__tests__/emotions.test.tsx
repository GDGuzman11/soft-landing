/**
 * Vitest unit tests for the post-refactor emotions picker screen
 * (`app-frontend/app/check-in/emotions.tsx`).
 *
 * The refactor replaced a single keyed ImageBackground (which remounted on
 * every swipe and caused a 2-3s decode delay) with a stable stack of all 5
 * emotion images, controlled solely by `opacity` and `pointerEvents`.
 *
 * These tests assert the visible contract of that stack and the navigation
 * branches around `handleSelect` / `advance`.
 *
 * The test environment is `node`, with no jsdom and no React Native runtime,
 * so we render through `react-test-renderer` after mocking out RN primitives,
 * Reanimated, gesture handler, expo-router, expo-haptics, the theme and the
 * checkIn service.
 */

import React from 'react'
import TestRenderer from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

// ---------------------------------------------------------------------------
// react-native — minimal mock that turns every host primitive into a tagged
// functional component so the test renderer can walk the tree by name.
// ---------------------------------------------------------------------------

vi.mock('react-native', () => {
  const React = require('react')

  const make =
    (name: string) =>
    (props: Record<string, unknown>) =>
      React.createElement(name, props, props.children as React.ReactNode)

  return {
    View: make('View'),
    Text: make('Text'),
    Pressable: make('Pressable'),
    ImageBackground: make('ImageBackground'),
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      flatten: (s: unknown) => s,
    },
    Dimensions: {
      get: () => ({ width: 390, height: 844 }),
    },
    Platform: { OS: 'ios', select: (o: { ios?: unknown; default?: unknown }) => o.ios ?? o.default },
    Animated: { View: make('Animated.View'), Text: make('Animated.Text') },
  }
})

// ---------------------------------------------------------------------------
// react-native-reanimated — provide spies for withTiming / withSpring etc.
// We expose vi.fn() spies so tests can assert call arguments. Spies are
// declared inside vi.hoisted() so they exist before the hoisted vi.mock()
// factories run.
// ---------------------------------------------------------------------------

const {
  withTimingSpy,
  withSpringSpy,
  withRepeatSpy,
  withSequenceSpy,
  cancelAnimationSpy,
  runOnJSSpy,
} = vi.hoisted(() => ({
  withTimingSpy: vi.fn((to: number, _opts?: unknown, cb?: (done: boolean) => void) => {
    if (cb) cb(true)
    return to
  }),
  withSpringSpy: vi.fn((to: number) => to),
  withRepeatSpy: vi.fn((v: unknown) => v),
  withSequenceSpy: vi.fn((v: unknown) => v),
  cancelAnimationSpy: vi.fn(),
  runOnJSSpy: vi.fn(<F extends (...a: unknown[]) => unknown>(fn: F) => fn),
}))

vi.mock('react-native-reanimated', () => {
  const React = require('react')
  const make =
    (name: string) =>
    (props: Record<string, unknown>) =>
      React.createElement(name, props, props.children as React.ReactNode)

  return {
    default: { View: make('Animated.View'), Text: make('Animated.Text') },
    View: make('Animated.View'),
    Text: make('Animated.Text'),
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withTiming: withTimingSpy,
    withSpring: withSpringSpy,
    withRepeat: withRepeatSpy,
    withSequence: withSequenceSpy,
    cancelAnimation: cancelAnimationSpy,
    runOnJS: runOnJSSpy,
  }
})

// ---------------------------------------------------------------------------
// react-native-gesture-handler — fake Gesture builders that record callbacks
// so tests can fire them synchronously.
// ---------------------------------------------------------------------------

interface FakePan {
  __kind: 'pan'
  __onUpdate?: (e: { translationX: number }) => void
  __onEnd?: (e: { translationX: number; velocityX: number }) => void
  onUpdate: (cb: (e: { translationX: number }) => void) => FakePan
  onEnd: (cb: (e: { translationX: number; velocityX: number }) => void) => FakePan
}
interface FakeTap {
  __kind: 'tap'
  __onEnd?: () => void
  onEnd: (cb: () => void) => FakeTap
}
interface FakeExclusive {
  __kind: 'exclusive'
  __children: Array<FakePan | FakeTap>
}

vi.mock('react-native-gesture-handler', () => {
  const React = require('react')

  const Pan = (): FakePan => {
    const g: FakePan = {
      __kind: 'pan',
      onUpdate(cb) {
        g.__onUpdate = cb
        return g
      },
      onEnd(cb) {
        g.__onEnd = cb
        return g
      },
    }
    return g
  }
  const Tap = (): FakeTap => {
    const g: FakeTap = {
      __kind: 'tap',
      onEnd(cb) {
        g.__onEnd = cb
        return g
      },
    }
    return g
  }

  return {
    Gesture: {
      Pan,
      Tap,
      Exclusive: (...children: Array<FakePan | FakeTap>): FakeExclusive => ({
        __kind: 'exclusive',
        __children: children,
      }),
    },
    GestureDetector: (props: { gesture: FakeExclusive; children: React.ReactNode }) =>
      React.createElement(
        'GestureDetector',
        // expose the gesture object on the rendered node so tests can grab it
        { gesture: props.gesture },
        props.children,
      ),
  }
})

// ---------------------------------------------------------------------------
// expo-router, expo-haptics, theme, checkIn service
// ---------------------------------------------------------------------------

const { routerPushSpy, routerBackSpy } = vi.hoisted(() => ({
  routerPushSpy: vi.fn(),
  routerBackSpy: vi.fn(),
}))

vi.mock('expo-router', () => ({
  router: {
    push: routerPushSpy,
    back: routerBackSpy,
  },
  useLocalSearchParams: () => ({}),
}))

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}))

vi.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      bg: '#FAF8F5',
      inkSecondary: '#1A1A1A',
      inkMuted: '#A09080',
      inkPrimary: '#3D2F2A',
      cardBorder: '#D4CABE',
      headerBg: '#EDE6D9',
      amber: '#C4956A',
      hairline: '#E8DDD0',
    },
    isDark: false,
  }),
}))

const { canCheckInSpy } = vi.hoisted(() => ({
  canCheckInSpy: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}))
vi.mock('@/services/checkIn', () => ({
  canCheckIn: () => canCheckInSpy(),
}))

// Static asset imports (.jpg) are aliased to a numeric stub by vitest.config.ts.

// ---------------------------------------------------------------------------
// SUT — import after mocks are set up.
// ---------------------------------------------------------------------------

// Path alias `@app/*` → `./app/*`. Use it to import the screen without
// reaching outside the project root.
import EmotionsScreen from '../app/check-in/emotions'

// Helpers ------------------------------------------------------------------

interface RenderedNode {
  type: string | { displayName?: string; name?: string }
  props: Record<string, unknown>
  children: RenderedNode[] | string | null
}

function findAllByType(
  tree: TestRenderer.ReactTestInstance,
  type: string,
): TestRenderer.ReactTestInstance[] {
  return tree.findAll((n: TestRenderer.ReactTestInstance) => typeof n.type === 'string' && n.type === type)
}

/**
 * Locate the 5 emotion-card wrapper Views: each is a `<View>` whose style
 * includes an `opacity` of 0 or 1, and which contains exactly one
 * `<ImageBackground>` child.
 */
function findCardWrappers(
  tree: TestRenderer.ReactTestInstance,
): TestRenderer.ReactTestInstance[] {
  return tree.findAll((n: TestRenderer.ReactTestInstance) => {
    if (typeof n.type !== 'string' || n.type !== 'View') return false
    const style = n.props.style as unknown
    const flat = Array.isArray(style)
      ? style.reduce(
          (acc: Record<string, unknown>, s: unknown) => ({
            ...acc,
            ...((s as Record<string, unknown>) ?? {}),
          }),
          {},
        )
      : ((style as Record<string, unknown>) ?? {})
    const op = (flat as { opacity?: number }).opacity
    if (op !== 0 && op !== 1) return false
    return n.findAll((c: TestRenderer.ReactTestInstance) => typeof c.type === 'string' && c.type === 'ImageBackground').length === 1
  })
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce(
      (acc: Record<string, unknown>, s: unknown) => ({
        ...acc,
        ...((s as Record<string, unknown>) ?? {}),
      }),
      {},
    )
  }
  return (style as Record<string, unknown>) ?? {}
}

function findGestureExclusive(tree: TestRenderer.ReactTestInstance): FakeExclusive | null {
  const detector = tree.findAll(
    (n: TestRenderer.ReactTestInstance) => typeof n.type === 'string' && n.type === 'GestureDetector',
  )[0]
  if (!detector) return null
  return detector.props.gesture as FakeExclusive
}

function getTapCallback(tree: TestRenderer.ReactTestInstance): (() => void) | undefined {
  const ex = findGestureExclusive(tree)
  if (!ex) return undefined
  const tap = ex.__children.find((c): c is FakeTap => '__onEnd' in c && !('__onUpdate' in c)) as
    | FakeTap
    | undefined
  return tap?.__onEnd
}

function getPanEndCallback(
  tree: TestRenderer.ReactTestInstance,
): ((e: { translationX: number; velocityX: number }) => void) | undefined {
  const ex = findGestureExclusive(tree)
  if (!ex) return undefined
  const pan = ex.__children.find((c): c is FakePan => '__onUpdate' in c) as FakePan | undefined
  return pan?.__onEnd
}

// flush microtasks between an async tap handler and assertions
const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EmotionsScreen: card-stack refactor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canCheckInSpy.mockResolvedValue(true)
  })

  afterEach(() => {
    // Nothing to unmount explicitly; each test creates its own renderer.
  })

  it('should render all 5 emotion ImageBackgrounds simultaneously on mount', () => {
    let renderer!: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      renderer = TestRenderer.create(React.createElement(EmotionsScreen))
    })
    const images = findAllByType(renderer.root, 'ImageBackground')
    expect(images).toHaveLength(5)
  })

  it('should make the active image opaque and the other four transparent on initial render', () => {
    // EMOTION_ORDER in the screen is [good, neutral, tired, sad, stressed].
    // activeIndex starts at 0 → "good" must have opacity 1.
    let renderer!: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      renderer = TestRenderer.create(React.createElement(EmotionsScreen))
    })

    const cardWrappers = findCardWrappers(renderer.root)
    expect(cardWrappers).toHaveLength(5)

    const opacities = cardWrappers.map(
      (w) => (flattenStyle(w.props.style) as { opacity?: number }).opacity,
    )
    expect(opacities[0]).toBe(1)
    expect(opacities.slice(1).every((o) => o === 0)).toBe(true)
  })

  it('should set pointerEvents to "auto" on the active card and "none" on inactive cards', () => {
    let renderer!: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      renderer = TestRenderer.create(React.createElement(EmotionsScreen))
    })

    const cardWrappers = findCardWrappers(renderer.root)
    expect(cardWrappers).toHaveLength(5)

    const pointerEvents = cardWrappers.map(
      (w) => (w.props as { pointerEvents?: string }).pointerEvents,
    )
    expect(pointerEvents[0]).toBe('auto')
    expect(pointerEvents.slice(1).every((p) => p === 'none')).toBe(true)
  })

  it('should NOT pass an onLoad handler or a key prop to ImageBackground (no remount on swipe)', () => {
    // The pre-refactor bug was a `key={emotion?.id}` + `onLoad` placeholder
    // toggle that caused full remount + slow image decode on every swipe.
    let renderer!: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      renderer = TestRenderer.create(React.createElement(EmotionsScreen))
    })

    const images = findAllByType(renderer.root, 'ImageBackground')
    for (const img of images) {
      expect(img.props.onLoad).toBeUndefined()
      // React strips `key` from props, so it should never appear here either.
      expect(img.props.key).toBeUndefined()
    }
  })

  it('should advance activeIndex from 0 → 1 (good → neutral) after a left swipe gesture commits', () => {
    let renderer!: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      renderer = TestRenderer.create(React.createElement(EmotionsScreen))
    })

    const onPanEnd = getPanEndCallback(renderer.root)
    expect(onPanEnd).toBeDefined()

    // Simulate a committed left swipe past threshold. withTiming is mocked
    // to invoke its completion callback synchronously, which triggers
    // runOnJS(advance)('left').
    TestRenderer.act(() => {
      onPanEnd!({ translationX: -200, velocityX: -800 })
    })

    const cardWrappers = findCardWrappers(renderer.root)
    const opacities = cardWrappers.map(
      (w) => (flattenStyle(w.props.style) as { opacity?: number }).opacity,
    )

    // good (i=0) hides, neutral (i=1) shows
    expect(opacities[0]).toBe(0)
    expect(opacities[1]).toBe(1)
  })

  it('should call withTiming(1, { duration: 200 }) for the label fade-in after advance()', () => {
    let renderer!: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      renderer = TestRenderer.create(React.createElement(EmotionsScreen))
    })
    withTimingSpy.mockClear()

    const onPanEnd = getPanEndCallback(renderer.root)
    TestRenderer.act(() => {
      onPanEnd!({ translationX: -200, velocityX: -800 })
    })

    // The first withTiming call belongs to the swipe-off transform; the label
    // fade is the call with `to === 1` and `duration: 200`.
    const matched = withTimingSpy.mock.calls.find(
      ([to, opts]) => to === 1 && (opts as { duration?: number } | undefined)?.duration === 200,
    )
    expect(matched).toBeDefined()
  })

  it('should navigate to /check-in/envelope with emotionId="good" when the card is tapped on initial render', async () => {
    let renderer!: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      renderer = TestRenderer.create(React.createElement(EmotionsScreen))
    })

    const onTap = getTapCallback(renderer.root)
    expect(onTap).toBeDefined()

    TestRenderer.act(() => {
      onTap!()
    })
    await flushPromises()

    expect(routerPushSpy).toHaveBeenCalledTimes(1)
    const arg = routerPushSpy.mock.calls[0][0] as {
      pathname: string
      params: { emotionId: string }
    }
    expect(arg.pathname).toBe('/check-in/envelope')
    expect(arg.params.emotionId).toBe('good')
  })

  it('should redirect to /paywall when canCheckIn() resolves false (free-tier gate)', async () => {
    canCheckInSpy.mockResolvedValueOnce(false)

    let renderer!: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      renderer = TestRenderer.create(React.createElement(EmotionsScreen))
    })

    const onTap = getTapCallback(renderer.root)
    TestRenderer.act(() => {
      onTap!()
    })
    await flushPromises()

    expect(routerPushSpy).toHaveBeenCalledTimes(1)
    expect(routerPushSpy).toHaveBeenCalledWith('/paywall')
  })
})
