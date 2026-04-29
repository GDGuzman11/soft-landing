Design 5 iOS medium widget variants (329×155pt canvas, 16pt safe area inset on all sides, usable content area 297×123pt) for Soft Landing. Same design system as the small widgets — repeat it here for self-containment:

Design system:

Background: #FAF8F5 · Card surface: #F5F0E8 · Amber: #C4956A · Primary text: #3D2F2A · Muted: #A09080
Emotion colors — stressed #C97B5A · tired #9C8FB5 · sad #7A95B0 · neutral #C4B59A · good #9CB59A
Fonts — DM Sans for UI/labels · Lora (serif) for verse and letter body · Lora italic for emotional copy
Corner radius: 22pt (iOS system rounding — no inner rounded rect)
No shadows on the widget frame
Widget F — "This One's For You"
The verse delivery widget — feels like something arrived, not something to do

Background: #F5F0E8

Layout — two columns, vertical divider between them:

Left column (40% width):

Centered vertically: envelope illustration — cream rectangle (68×52pt, #FAF8F5) with a 1pt amber V-flap. Wax seal: filled amber circle 14pt #C4956A centered on bottom edge of envelope, with a tiny embossed ✦ inside in #FAF8F5 at 8pt.
Below envelope: DM Sans 9pt caps amber: "JUST FOR YOU"
Divider: 0.5pt vertical line #C4B59A at 40% column boundary, top-to-bottom with 12pt padding top and bottom

Right column (60% width):

Top: DM Sans 10pt #A09080: "Your verse for today is ready."
Middle: Lora italic 13pt #3D2F2A, 3 lines max: "He heals the broken-hearted and binds up their wounds."
Below verse: DM Sans 9pt caps #C4956A: "PSALM 147:3"
Bottom-right: amber pill (80×28pt, filled #C4956A): DM Sans 10pt white "Open it →"
The envelope on the left should feel like something physical just landed — not a button, not a badge. A delivery.

Dark mode: background #2A2319, envelope #1C1712, flap line #C4956A, text #EDE8DF

Widget G — "Full Verse"
The medium size earns the right to show the complete verse — no truncation

Background: #FAF8F5

Layout — single column, generous vertical padding:

Top-left: emotion color dot 8pt (use #9CB59A — good state) + DM Sans 9pt caps #A09080 beside it: "GOOD · APRIL 28"
Thin amber hairline 0.5pt full width at 30pt from top
Center: Lora italic 15pt #3D2F2A, centered, full verse in 3–4 lines: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles."
Below text: DM Sans 10pt caps amber centered: "ISAIAH 40:31"
Bottom-right: DM Sans 9pt #A09080: "Saved · Tap to read letter →"
The hairline and centered type should feel like an open book or a devotional card — calm, reverent, complete.

Dark mode: background #1C1712, text #EDE8DF, reference #C4956A

Widget H — "Your Recent Letters"
Two-letter preview side by side — the archive made visible

Background: #FAF8F5

Layout — two equal columns, 8pt gap between them, no divider line:

Each column is a mini letter card (surface #F5F0E8, corner radius 12pt, padding 10pt):

Top: emotion color dot 6pt + DM Sans 8pt caps #A09080 date: "APR 24"
Scripture reference: DM Sans 9pt #C4956A: "Isaiah 40:31"
Thin amber rule 0.5pt full width
Letter excerpt: Lora 11pt #3D2F2A, 3 lines, trailing ...: "Even on a good day I forget to rest in this..."
Cards sit side by side within the safe area. If only one letter exists, right card shows: centered Lora italic 12pt #A09080 "Write your next letter →" with no card background tint.

Dark mode: outer #1C1712, card #2A2319, text #EDE8DF

Widget I — "Emotion Mosaic"
6-week dot grid — a self-portrait, not a streak counter

Background: #FAF8F5

Layout — left column (labels) + right main area (grid):

Left column (20% width), DM Sans 8pt #A09080, top-aligned, evenly spaced for 6 rows:

W1 / W2 / W3 / W4 / W5 / W6 (week labels)
Grid (7 columns × 6 rows, 8pt diameter dots, 6pt gap):

Column headers: M T W T F S S in DM Sans 7pt #A09080
Dot states:
Letter written that day: filled circle, full emotion color (example fill: #9CB59A, #7A95B0, #C97B5A)
Check-in but no letter: filled circle, same emotion color at 25% opacity
No activity: transparent (space preserved — do not show a dot)
Today's dot: same fill + 1.5pt amber ring #C4956A around it
Bottom-left: DM Sans 8pt #A09080: "6 letters written" — never framed as a score, just a count.

Dark mode: background #1C1712, labels #5A5048, dots same colors

Widget J — "The Line That Stayed (Medium)"
Full resonant-line moment — the most premium-feeling widget

Background: #FAF8F5

Layout:

3pt vertical amber rule #C4956A on left edge (flush to 16pt inset, full content height)
Text block (20pt left padding from the rule): Lora italic 16pt #3D2F2A, left-aligned, up to 4 lines — the exact resonant sentence from the last AI letter: "Even on a good day I forget to rest in this. That's what I needed to hear."
Below text: thin 0.5pt amber hairline full width
Bottom row: left side DM Sans 9pt #A09080: "From your letter · Apr 24" — right side: DM Sans 9pt amber #C4956A: "Read full letter →"
Top-right: ✦ 9pt #C4956A
The wider canvas lets the quote breathe. No emotion dot, no envelope — just the sentence that stayed with them.

Dark mode: background #1C1712, text #EDE8DF, rule stays #C4956A

Deliver all 5 medium widgets stacked vertically on a single frame. Show each at 1.5× scale. Place the dark mode variant directly to the right of each light variant. Label each with its letter (F–J) and name. Add a thin 1pt #E0D8CC separator between each widget row.

