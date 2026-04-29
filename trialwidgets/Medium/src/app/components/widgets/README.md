# Soft Landing — Widget Components

Drop-in React components for the 5 small widget designs (155×155pt iOS canvas).
Pure inline styles + tokens — no Tailwind, no CSS imports required.

## Install

Copy `src/components/widgets/` into your app. Then load fonts once globally:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Lora:ital,wght@0,400..700;1,400..700&display=swap');
```

## Usage

```tsx
import { SoftOpen, CarriedVerse, DoorOpen, SpeakFreely, LineThatStayed } from './components/widgets';

<SoftOpen
  name="Anna"
  theme="auto"
  onEmotionSelect={(e) => router.push(`/checkin?mood=${e}`)}
/>

<CarriedVerse
  reference="Psalm 34:18"
  text="The Lord is close to the broken-hearted…"
  emotion="sad"
  onTap={() => router.push('/verse/last')}
/>

<DoorOpen onTap={() => router.push('/letter')} />

<SpeakFreely onBegin={() => router.push('/letter/new')} />

<LineThatStayed
  line="Even on a good day I forget to rest in this."
  source="From your letter · Apr 24"
/>
```

## Props

All widgets accept:
- `theme?: 'light' | 'dark' | 'auto'` — default `'light'`. `auto` reads `prefers-color-scheme`.
- `scale?: number` — default `1` (155px). Use `2` for retina previews (310px).
- `onTap?: () => void` — fires when widget body is tapped.

Per-widget props (all optional, all have defaults):
- **SoftOpen**: `name`, `greeting`, `prompt`, `onEmotionSelect(emotion)`
- **CarriedVerse**: `reference`, `text`, `emotion`
- **DoorOpen**: `primary`, `secondary`
- **SpeakFreely**: `label`, `buttonLabel`, `onBegin`
- **LineThatStayed**: `line`, `source`

## Tokens

Import the design tokens to match other surfaces in your app:

```ts
import { widgetTokens, emotionColors } from './components/widgets';
```
