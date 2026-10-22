// Crash reporting (Sentry) honors the user's "Crash reporting" choice in Settings.
// Sentry.init() must run at app module-load, before the stored preference can be read
// asynchronously, so event delivery is gated by this module-level flag. The flag is flipped
// once the preference loads (see app/_layout.tsx) and whenever the user toggles it in Settings.
// Default: enabled.
let enabled = true

export function setCrashReportingEnabled(value: boolean): void {
  enabled = value
}

export function isCrashReportingEnabled(): boolean {
  return enabled
}
