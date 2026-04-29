import { WidgetFrame } from './WidgetFrame';
import { BASE_INSET, WidgetTheme, fonts, resolveTheme, widgetTokens } from './tokens';

export interface SpeakFreelyProps {
  label?: string;
  buttonLabel?: string;
  theme?: WidgetTheme;
  scale?: number;
  onBegin?: () => void;
  onTap?: () => void;
}

export function SpeakFreely({
  label = 'Write a letter',
  buttonLabel = 'Begin →',
  theme = 'light',
  scale = 1,
  onBegin,
  onTap,
}: SpeakFreelyProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;

  return (
    <WidgetFrame background={t.card} scale={scale} onTap={onTap} ariaLabel="Write a letter">
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: `${inset}px`,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            color: t.muted,
            fontFamily: fonts.sans,
            fontSize: `${10 * scale}px`,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: `${16 * scale}px`,
            marginTop: `${5 * scale}px`,
            marginBottom: `${5 * scale}px`,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{ height: '1px', backgroundColor: t.rule, position: 'relative' }}
            >
              {i === 0 && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: `${1 * scale}px`,
                    color: widgetTokens.amber,
                    fontFamily: fonts.sans,
                    fontSize: `${12 * scale}px`,
                    lineHeight: 1,
                  }}
                >
                  |
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onBegin?.();
            }}
            style={{
              width: `${60 * scale}px`,
              height: `${24 * scale}px`,
              borderRadius: `${12 * scale}px`,
              backgroundColor: widgetTokens.amber,
              color: '#FFFFFF',
              fontFamily: fonts.sans,
              fontSize: `${10 * scale}px`,
              fontWeight: 600,
              border: 'none',
              cursor: onBegin ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </WidgetFrame>
  );
}
