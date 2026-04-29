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

export interface FullVerseProps {
  reference?: string;
  text?: string;
  emotion?: Emotion;
  date?: string;
  footer?: string;
  theme?: WidgetTheme;
  scale?: number;
  onTap?: () => void;
}

export function FullVerse({
  reference = 'ISAIAH 40:31',
  text = 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.',
  emotion = 'good',
  date = 'APRIL 28',
  footer = 'Saved · Tap to read letter →',
  theme = 'light',
  scale = 1,
  onTap,
}: FullVerseProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;

  return (
    <MediumWidgetFrame background={t.bg} scale={scale} onTap={onTap} ariaLabel={`Verse ${reference}`}>
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
        {/* Top emotion + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: `${6 * scale}px` }}>
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
              color: t.muted,
              fontFamily: fonts.sans,
              fontSize: `${9 * scale}px`,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {emotion} · {date}
          </span>
        </div>

        {/* Hairline at 30pt from top */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${30 * scale}px`,
            height: '1px',
            backgroundColor: widgetTokens.amber,
            opacity: 0.4,
          }}
        />

        {/* Centered verse */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${8 * scale}px`,
            padding: `0 ${8 * scale}px`,
          }}
        >
          <p
            style={{
              color: t.text,
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              fontSize: `${15 * scale}px`,
              lineHeight: 1.32,
              textAlign: 'center',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {text}
          </p>
          <div
            style={{
              color: widgetTokens.amber,
              fontFamily: fonts.sans,
              fontSize: `${10 * scale}px`,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {reference.toUpperCase()}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            color: t.muted,
            fontFamily: fonts.sans,
            fontSize: `${9 * scale}px`,
            textAlign: 'right',
          }}
        >
          {footer}
        </div>
      </div>
    </MediumWidgetFrame>
  );
}
