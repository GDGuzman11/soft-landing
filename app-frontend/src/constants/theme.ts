/**
 * Soft Landing design system.
 *
 * Single source of truth for colors, typography, spacing, radius, shadow,
 * and animation. Components must import from here rather than hard-coding
 * values so the visual language stays consistent.
 */

/**
 * Brand and semantic colors. Emotion colors mirror the values defined in
 * `constants/emotions.ts` so they can be referenced from style sheets that
 * don't need the full emotion catalog.
 */
export const COLORS = {
  background: '#FAF8F5',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  accent: '#C4956A',
  border: '#E8E3DC',
  error: '#E57373',
  emotion: {
    sad: '#B0BEC5',
    neutral: '#D4C5B0',
    stressed: '#E8A598',
    tired: '#C5B8D4',
    good: '#A8C5A0',
  },
} as const;

/**
 * Typography scale. `dmSans` is used for UI chrome; `lora` is reserved for
 * the message reveal copy. Weights map to the variants we ship as fonts.
 */
export const TYPOGRAPHY = {
  fontFamily: {
    dmSans: {
      regular: 'DMSans-Regular',
      medium: 'DMSans-Medium',
      bold: 'DMSans-Bold',
    },
    lora: {
      regular: 'Lora-Regular',
      medium: 'Lora-Medium',
      italic: 'Lora-Italic',
      bold: 'Lora-Bold',
    },
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/**
 * Spacing scale in points. Multiply the key by 4 to get pixel value
 * (e.g. SPACING[4] === 16). Use these tokens instead of raw numbers.
 */
export const SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Border radius scale. `full` produces a pill / circle. */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * Soft drop shadow used for cards and the floating envelope.
 * Includes both iOS shadow props and the Android `elevation` value.
 */
export const SHADOW = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

/**
 * Animation tuning. Spring configs target `react-native-reanimated`'s
 * `withSpring`; timing values are in milliseconds.
 */
export const ANIMATION = {
  envelopeSpring: {
    damping: 14,
    stiffness: 120,
    mass: 1,
  },
  cardSpring: {
    damping: 18,
    stiffness: 160,
    mass: 1,
  },
  ENVELOPE_BOB_DURATION: 6000,
  TAP_HINT_DELAY: 1200,
} as const;

/** Hard limits enforced by the free tier. */
export const LIMITS = {
  FREE_CHECKINS_PER_DAY: 3,
  HISTORY_DAYS_FREE: 7,
} as const;
