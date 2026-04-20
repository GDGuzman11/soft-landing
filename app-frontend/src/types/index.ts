/**
 * Core TypeScript types for the Soft Landing app.
 *
 * Soft Landing is a premium emotional check-in app: users select an emotion,
 * watch an envelope animation, and receive a validating message. All data is
 * stored locally; subscriptions are managed via RevenueCat.
 */

/** Identifier for one of the five top-level emotions a user can pick. */
export type EmotionId = 'sad' | 'neutral' | 'stressed' | 'tired' | 'good';

/** Subscription tier the user is currently on. */
export type Tier = 'free' | 'premium';

/** Severity classification used by the internal bug tracking schema. */
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';

/** Lifecycle status used by the internal bug tracking schema. */
export type BugStatus = 'open' | 'in-progress' | 'resolved' | 'wont-fix';

/** Theme preference. `system` follows the device setting. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Cadence for daily check-in reminder notifications. */
export type NotificationFrequency = 'off' | 'daily' | 'twice-daily' | 'custom';

/** ISO-8601 timestamp string (e.g. `2026-04-17T14:30:00.000Z`). */
export type IsoTimestamp = string;

/** ISO-8601 calendar date string (e.g. `2026-04-17`). */
export type IsoDate = string;

/** Time of day in 24-hour `HH:mm` format (e.g. `08:30`). */
export type TimeOfDay = string;

/**
 * A top-level emotion the user can pick on the check-in screen.
 * Drives both the visual treatment and the message pool used for the reveal.
 */
export interface Emotion {
  /** Stable identifier referenced by messages and check-in events. */
  id: EmotionId;
  /** Human-readable label shown on the check-in card. */
  label: string;
  /** Brand color associated with this emotion (hex string, e.g. `#A8C5A0`). */
  color: string;
  /** Optional finer-grained emotions a premium user can drill into. */
  subEmotions: SubEmotion[];
}

/**
 * Optional finer-grained emotion that lives under a top-level Emotion.
 * Reserved for premium-tier expansion of the emotion taxonomy.
 */
export interface SubEmotion {
  /** Stable identifier (unique within its parent emotion). */
  id: string;
  /** Parent emotion this sub-emotion belongs to. */
  parentId: EmotionId;
  /** Human-readable label. */
  label: string;
  /** Optional accent color override; falls back to parent emotion color. */
  color?: string;
}

/**
 * A single validating message that may be shown after a check-in.
 * Selection is weighted by `weight` and demoted by recent `lastUsed` /
 * `usageCount` to keep the experience feeling fresh.
 */
export interface Message {
  /** Stable identifier for this message. */
  id: string;
  /** Top-level emotion this message is associated with. */
  emotionId: EmotionId;
  /** Optional sub-emotion this message is associated with. */
  subEmotionId?: string;
  /** The validating copy shown to the user. */
  body: string;
  /** Scripture reference for the verse (e.g. "Psalm 34:18"). */
  reference?: string;
  /** Free-form tags used for filtering and analytics (e.g. `grief`, `work`). */
  tags: string[];
  /** Tier required to receive this message. */
  tier: Tier;
  /** Selection weight from 1 (rarely shown) to 10 (frequently shown). */
  weight: number;
  /** Number of times this message has been shown to the user. */
  usageCount: number;
  /** ISO timestamp of the most recent time the message was shown, if ever. */
  lastUsed: IsoTimestamp | null;
}

/**
 * A logged check-in event. Persisted locally to power history and
 * day-bucketed quota counting for the free tier.
 */
export interface CheckInEvent {
  /** Stable identifier for this event. */
  id: string;
  /** ISO timestamp when the user completed the check-in. */
  timestamp: IsoTimestamp;
  /** The emotion the user selected. */
  emotionId: EmotionId;
  /** Sub-emotion selected, if any. */
  subEmotionId?: string;
  /** The message the user was shown for this check-in. */
  messageId: string;
  /** Whether the user explicitly saved the resulting message. */
  saved: boolean;
}

/**
 * A message the user has explicitly saved from a prior check-in.
 * Saved messages are surfaced in the journal/history view.
 */
export interface SavedMessage {
  /** Stable identifier for this saved entry. */
  id: string;
  /** Check-in this save originated from. */
  checkInId: string;
  /** Underlying message that was saved. */
  messageId: string;
  /** ISO timestamp when the user saved it. */
  savedAt: IsoTimestamp;
  /** Optional user-supplied note attached to the saved message. */
  note?: string;           // user's typed input ("what's on your heart")
  /** AI-generated letter text. */
  letter?: string;         // AI-generated letter text
  /** Denormalized emotion id to avoid extra lookup in history. */
  emotionId?: EmotionId;   // denormalized to avoid extra lookup in history
}

/**
 * Per-user notification preferences for daily check-in reminders.
 * Times are stored in `HH:mm` and interpreted in the user's local `timezone`.
 */
export interface NotificationPreference {
  /** Whether reminders are enabled at all. */
  enabled: boolean;
  /** Cadence selection. */
  frequency: NotificationFrequency;
  /** Local times reminders should fire (e.g. `['09:00', '20:30']`). */
  times: TimeOfDay[];
  /** IANA timezone identifier (e.g. `America/Los_Angeles`). */
  timezone: string;
}

/**
 * Snapshot of the user's RevenueCat subscription state, mirrored locally
 * so the UI can render quickly without waiting on the network.
 */
export interface SubscriptionState {
  /** Effective tier currently granted to the user. */
  tier: Tier;
  /** Active RevenueCat entitlement identifiers. */
  entitlements: string[];
  /** ISO timestamp the active entitlement expires; null if none. */
  expiresAt: IsoTimestamp | null;
  /** Whether the user is currently in a free trial. */
  isTrialing: boolean;
}

/**
 * Top-level app settings persisted to local storage.
 * Acts as the single source of truth for cross-cutting user preferences.
 */
export interface AppSettings {
  /** Theme preference. */
  theme: ThemePreference;
  /** Display name the user entered during onboarding. */
  name: string;
  /** Whether haptic feedback is enabled on supported devices. */
  haptics: boolean;
  /** Notification preferences. */
  notifications: NotificationPreference;
  /** Locally-mirrored subscription snapshot. */
  subscription: SubscriptionState;
  /** Whether the user has finished the onboarding flow. */
  onboardingComplete: boolean;
  /** Whether the user has seen the Christian faith intro screen. */
  faithIntroComplete: boolean;
  /** Number of check-ins the user has completed today (free-tier quota). */
  checkInsToday: number;
  /** ISO calendar date the `checkInsToday` counter applies to. */
  lastCheckInDate: IsoDate | null;
  /** Whether the user is browsing as a guest (not signed in). */
  isGuest: boolean;
  /** Whether the user has used their first free AI letter. */
  firstLetterUsed: boolean;
  /** Whether the user has accepted the app disclaimer. */
  disclaimerAccepted: boolean;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

/**
 * Internal bug record. Used by the QA/triage tooling that ships alongside
 * the app; not exposed to end users.
 */
export interface Bug {
  /** Stable identifier for this bug. */
  id: string;
  /** Short human-readable title. */
  title: string;
  /** Detailed description, repro steps, and observed behavior. */
  description: string;
  /** Severity classification. */
  severity: BugSeverity;
  /** Lifecycle status. */
  status: BugStatus;
  /** Identifier of the assignee, if any. */
  assignee?: string;
  /** Identifier of the reporter who filed the bug. */
  reporter: string;
  /** ISO timestamp when the bug was reported. */
  reportedAt: IsoTimestamp;
  /** ISO timestamp of the most recent update to the record. */
  updatedAt: IsoTimestamp;
  /** ISO timestamp when the bug was resolved, if applicable. */
  resolvedAt?: IsoTimestamp;
  /** Free-form tags for grouping (e.g. `onboarding`, `paywall`). */
  tags: string[];
  /** App version where the bug was first observed. */
  appVersion?: string;
  /** Platform where the bug was first observed. */
  platform?: 'ios' | 'android' | 'web';
  /** Optional URLs of attached screenshots or recordings. */
  attachments?: string[];
}
