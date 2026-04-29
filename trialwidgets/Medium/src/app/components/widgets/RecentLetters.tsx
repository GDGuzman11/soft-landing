import { MediumWidgetFrame } from './MediumWidgetFrame';
import {
  BASE_INSET,
  Emotion,
  WidgetTheme,
  emotionColors,
  fonts,
  resolveTheme,
  widgetTokens,
} from './tokens';

export interface LetterSummary {
  date: string;
  reference: string;
  emotion: Emotion;
  excerpt: string;
}

export interface RecentLettersProps {
  letters?: LetterSummary[];
  emptyLabel?: string;
  theme?: WidgetTheme;
  scale?: number;
  onTap?: () => void;
}

const DEFAULT_LETTERS: LetterSummary[] = [
  {
    date: 'APR 24',
    reference: 'Isaiah 40:31',
    emotion: 'tired',
    excerpt: 'Even on a good day I forget to rest in this…',
  },
  {
    date: 'APR 19',
    reference: 'Psalm 34:18',
    emotion: 'sad',
    excerpt: 'You said you felt unseen — He is closer than you know…',
  },
];

export function RecentLetters({
  letters = DEFAULT_LETTERS,
  emptyLabel = 'Write your next letter →',
  theme = 'light',
  scale = 1,
  onTap,
}: RecentLettersProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;

  const left = letters[0];
  const right = letters[1];

  return (
    <MediumWidgetFrame background={t.bg} scale={scale} onTap={onTap} ariaLabel="Recent letters">
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: `${inset}px`,
          display: 'flex',
          gap: `${8 * scale}px`,
          boxSizing: 'border-box',
        }}
      >
        <LetterCard letter={left} mode={mode} t={t} scale={scale} emptyLabel={emptyLabel} />
        <LetterCard letter={right} mode={mode} t={t} scale={scale} emptyLabel={emptyLabel} />
      </div>
    </MediumWidgetFrame>
  );
}

function LetterCard({
  letter,
  mode,
  t,
  scale,
  emptyLabel,
}: {
  letter: LetterSummary | undefined;
  mode: 'light' | 'dark';
  t: typeof widgetTokens.light;
  scale: number;
  emptyLabel: string;
}) {
  if (!letter) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${10 * scale}px`,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            color: t.muted,
            fontFamily: fonts.serif,
            fontStyle: 'italic',
            fontSize: `${12 * scale}px`,
            lineHeight: 1.3,
          }}
        >
          {emptyLabel}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: t.card,
        borderRadius: `${12 * scale}px`,
        padding: `${10 * scale}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: `${5 * scale}px`,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: `${5 * scale}px` }}>
        <span
          style={{
            width: `${6 * scale}px`,
            height: `${6 * scale}px`,
            borderRadius: '50%',
            backgroundColor: emotionColors[letter.emotion],
          }}
        />
        <span
          style={{
            color: t.muted,
            fontFamily: fonts.sans,
            fontSize: `${8 * scale}px`,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {letter.date}
        </span>
      </div>
      <div
        style={{
          color: widgetTokens.amber,
          fontFamily: fonts.sans,
          fontSize: `${9 * scale}px`,
          fontWeight: 600,
        }}
      >
        {letter.reference}
      </div>
      <div
        style={{
          height: '1px',
          backgroundColor: widgetTokens.amber,
          opacity: 0.4,
          margin: `${1 * scale}px 0`,
        }}
      />
      <p
        style={{
          color: t.text,
          fontFamily: fonts.serif,
          fontSize: `${11 * scale}px`,
          lineHeight: 1.32,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
        }}
      >
        {letter.excerpt}
      </p>
    </div>
  );
}
