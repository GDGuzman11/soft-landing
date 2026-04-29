import { WidgetFrame } from './WidgetFrame';
import {
  BASE_INSET,
  Emotion,
  WidgetTheme,
  emotionColors,
  emotionOrder,
  fonts,
  resolveTheme,
  widgetTokens,
} from './tokens';

export interface SoftOpenProps {
  name?: string;
  greeting?: string;
  prompt?: string;
  theme?: WidgetTheme;
  scale?: number;
  onEmotionSelect?: (emotion: Emotion) => void;
  onTap?: () => void;
}

export function SoftOpen({
  name = 'friend',
  greeting = 'Good morning',
  prompt = 'How are you today?',
  theme = 'light',
  scale = 1,
  onEmotionSelect,
  onTap,
}: SoftOpenProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;
  const dotOpacity = mode === 'dark' ? 0.9 : 1;

  return (
    <WidgetFrame background={t.bg} scale={scale} onTap={onTap} ariaLabel="Daily emotion check-in">
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: `${inset}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${6 * scale}px`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ color: widgetTokens.amber, fontFamily: fonts.sans, fontSize: `${10 * scale}px`, lineHeight: 1 }}>
          ✦
        </div>
        <div
          style={{
            color: t.text,
            fontFamily: fonts.serif,
            fontStyle: 'italic',
            fontSize: `${13 * scale}px`,
            lineHeight: 1.2,
            textAlign: 'center',
          }}
        >
          {greeting}, {name}.
        </div>
        <div
          style={{
            color: t.muted,
            fontFamily: fonts.sans,
            fontSize: `${10 * scale}px`,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: `${2 * scale}px`,
          }}
        >
          {prompt}
        </div>
        <div style={{ display: 'flex', gap: `${4 * scale}px`, marginTop: `${5 * scale}px` }}>
          {emotionOrder.map((e) => (
            <button
              key={e}
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                onEmotionSelect?.(e);
              }}
              aria-label={e}
              style={{
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
                borderRadius: '50%',
                backgroundColor: emotionColors[e],
                opacity: dotOpacity,
                border: 'none',
                padding: 0,
                cursor: onEmotionSelect ? 'pointer' : 'default',
              }}
            />
          ))}
        </div>
      </div>
    </WidgetFrame>
  );
}
