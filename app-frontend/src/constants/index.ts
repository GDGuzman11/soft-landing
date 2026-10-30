/** Barrel export for the constants module. */
export * from './emotions';
export * from './theme';

/**
 * Free-first V1 master unlock. When true, every premium-gated feature (full
 * verse library, all Say personas, History reflections) is open to all users
 * and the paywall is hidden. V1.1: flip to false and wire RevenueCat
 * entitlement gating.
 */
export const V1_UNLOCK_ALL = true;

/**
 * Daily check-in cap — API cost control, not an upsell (BUG-014). Disabled for
 * TestFlight so testers aren't blocked. Flip CHECK_IN_LIMIT_ENABLED to true
 * before the public App Store submission; confirm FREE_CHECKINS_PER_DAY first.
 */
export const CHECK_IN_LIMIT_ENABLED = false;
export const FREE_CHECKINS_PER_DAY = 20;

/**
 * Free-tier AI "Dear You" letters per day (the verse itself is always free).
 * Enforced SERVER-SIDE in generateLetter, behind the backend ENFORCE_PREMIUM
 * flag (also inert until launch). Mirrors app-backend premium.ts FREE_LETTERS_PER_DAY.
 */
export const FREE_LETTERS_PER_DAY = 1;

/** RevenueCat entitlement identifier that marks a user as premium. */
export const REVENUECAT_ENTITLEMENT_ID = 'premium';
