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
