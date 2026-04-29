---
name: iOS widget family system for Soft Landing
description: Visual conventions and shared rules established for the small-widget family (A–E); apply to future medium, large, and lockscreen variants
type: project
---

iOS small widget family for Soft Landing established 2026-04-26. Five widgets share these conventions:

**Shared visual rules:**
- Container borderRadius 16pt; internal cards 12pt
- Safe area: 16pt inset on all four edges, never violated
- Shadow: `rgba(61, 47, 42, 0.04)` 8pt blur light mode; `rgba(0, 0, 0, 0.3)` 12pt blur dark mode
- Hairline: `#E8E3DC` light / `#3D2F2A` dark, always 0.5pt
- Emotion dots: 8pt default, 10pt active state with `#FAF8F5` 1pt ring + `#E8E3DC` 0.5pt halo

**Wax seal envelope icon usage (signals letter state across family):**
- Widget B (Carried Verse): small 22pt, 60% opacity, retreating
- Widget C (Re-engagement): large 36pt, sealed flap, central, focal element
- Widget D (Speak Freely): absent — page is unsealed/blank/receiving
- Widget E (The Line That Stayed): small 20pt, opened flap, signals "letter received"
- Widget A (Soft Open): absent — uses ✦ ornament instead as front-door mark

**Typography contract:**
- Lora 400 Italic: emotional copy, verses, resonant lines, soft voice (all 5 headlines)
- DM Sans 500: metadata, references, secondary copy, CTAs
- Never mix Lora with caps; never use DM Sans for emotional content
- Minimum 12pt everywhere — no exceptions

**Premium-locked treatment:**
- Amber `#C4956A` overlay at 12% (light) / 18% (dark) over full widget surface
- 14pt amber lock icon centered with "Unlock in Soft Landing +" in Lora 400 Italic 14pt below
- Underlying content visible at ~50% beneath overlay — user sees what they're missing

**Why:** Widgets are emotional entry points, not decoration. The seal-state language (sealed → open) tells a wordless story across the home screen. The typography split (Lora for soul, DM Sans for chrome) holds the brand in a 155pt canvas.

**How to apply:** When designing medium (329×155), large (329×345), or lockscreen widgets, inherit these tokens, the seal-state grammar, and the typography contract. Never introduce a new font, new accent color, or violate the 16pt safe area inset. Re-engagement copy must never shame (cap day counts at "a while" past 14 days).
