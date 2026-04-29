export const widgetTokens = {
  light: {
    bg: '#FAF8F5',
    card: '#F5F0E8',
    text: '#3D2F2A',
    muted: '#A09080',
    rule: '#C4B59A',
    envelope: '#F5F0E8',
  },
  dark: {
    bg: '#1C1712',
    card: '#2A2319',
    text: '#EDE8DF',
    muted: '#A09080',
    rule: '#3D2F2A',
    envelope: '#2A2319',
  },
  amber: '#C4956A',
} as const;

export const emotionColors = {
  stressed: '#C97B5A',
  tired: '#9C8FB5',
  sad: '#7A95B0',
  neutral: '#C4B59A',
  good: '#9CB59A',
} as const;

export type Emotion = keyof typeof emotionColors;
export const emotionOrder: Emotion[] = ['stressed', 'tired', 'sad', 'neutral', 'good'];

export const fonts = {
  sans: '"DM Sans", system-ui, -apple-system, sans-serif',
  serif: 'Lora, Georgia, "Times New Roman", serif',
} as const;

export type WidgetTheme = 'light' | 'dark' | 'auto';

export function resolveTheme(theme: WidgetTheme): 'light' | 'dark' {
  if (theme !== 'auto') return theme;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export const BASE_SIZE = 155;
export const BASE_INSET = 16;
export const BASE_RADIUS = 22;
