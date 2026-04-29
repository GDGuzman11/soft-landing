import { WidgetFrame } from './WidgetFrame';
import {
  BASE_INSET,
  Emotion,
  WidgetTheme,
  emotionColors,
  fonts,
  resolveTheme,
  widgetTokens,
} from './tokens';

export interface CarriedVerseProps {
  reference?: string;
  text?: string;
  emotion?: Emotion;
  theme?: WidgetTheme;
  scale?: number;
  onTap?: () => void;
}

export function CarriedVerse({
  reference = 'PSALM 34:18',
  text = 'The Lord is close to the broken-hearted and saves those who…',
  emotion = 'sad',
  theme = 'light',
  scale = 1,
  onTap,
}: CarriedVerseProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;

  return (
    <WidgetFrame background={t.card} scale={scale} onTap={onTap} ariaLabel={`Verse ${reference}`}>
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: `${inset}px`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              width: `${8 * scale}px`,
              height: `${8 * scale}px`,
              borderRadius: '50%',
              backgroundColor: emotionColors[emotion],
            }}
          />
          <span
            style={{
              color: widgetTokens.amber,
              fontFamily: fonts.sans,
              fontSize: `${10 * scale}px`,
              fontWeight: 600,
              letterSpacing: '0.1em',
            }}
          >
            {reference.toUpperCase()}
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${20 * scale}px`,
            height: '1px',
            backgroundColor: widgetTokens.amber,
            opacity: 0.4,
          }}
        />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: `${4 * scale}px` }}>
          <p
            style={{
              color: t.text,
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              fontSize: `${12 * scale}px`,
              lineHeight: 1.32,
              textAlign: 'left',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {text}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span
            style={{
              color: widgetTokens.amber,
              fontFamily: fonts.sans,
              fontSize: `${14 * scale}px`,
              lineHeight: 1,
            }}
          >
            ›
          </span>
        </div>
      </div>
    </WidgetFrame>
  );
}
