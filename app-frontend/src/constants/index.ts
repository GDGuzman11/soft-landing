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
