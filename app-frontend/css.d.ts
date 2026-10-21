// Type declaration for side-effect CSS imports (e.g. `import '../global.css'`
// in app/_layout.tsx, required by NativeWind).
//
// Expo already declares `declare module '*.css'` in expo/types/global.d.ts, but
// that is only pulled in via `expo-env.d.ts` — which Expo gitignores and
// regenerates on `expo start`/`expo export`. CI runs `tsc --noEmit` directly
// (no expo step), so that file is absent and the CSS import has no type. This
// committed declaration makes the import resolve in CI as well as locally.
declare module '*.css'
