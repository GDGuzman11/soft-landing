---
name: Deterministic Math.random for weighted-selection tests
description: Pattern for asserting probabilistic selection ratios without flakiness
type: feedback
---

For tests that assert distribution ratios over a weighted random pool (e.g. selector anti-repetition, intent-tag boost), spy on `Math.random` with a deterministic uniform sweep instead of letting it run free.

```ts
let seed = 0
const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
  const r = (seed % 100) / 100
  seed++
  return r
})
// ... run N iterations ...
randSpy.mockRestore()
```

**Why:** Real `Math.random()` produces variance that occasionally violates ratio assertions ("B should be picked >3x more than A"), causing flaky CI runs. A 0..0.99 sweep across N iterations gives a perfectly uniform sample of the cumulative weight distribution — assertions become deterministic.

**How to apply:** Any selector/weighted-pick test that asserts "X chosen more often than Y" over many iterations. Use loose ratios (`>3x`, not exact counts) so the test still tolerates implementation tweaks to penalty factors.
