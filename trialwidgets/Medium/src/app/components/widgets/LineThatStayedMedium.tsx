import { MediumWidgetFrame } from './MediumWidgetFrame';
import { BASE_INSET, WidgetTheme, fonts, resolveTheme, widgetTokens } from './tokens';

export interface LineThatStayedMediumProps {
  line?: string;
  source?: string;
  cta?: string;
  theme?: WidgetTheme;
  scale?: number;
  onReadFull?: () => void;
  onTap?: () => void;
}

export function LineThatStayedMedium({
  line = "Even on a good day I forget to rest in this. That's what I needed to hear.",
  source = 'From your letter · Apr 24',
  cta = 'Read full letter →',
  theme = 'light',
  scale = 1,
  onReadFull,
  onTap,
}: LineThatStayedMediumProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;

  return (
    <MediumWidgetFrame background={t.bg} scale={scale} onTap={onTap} ariaLabel="The line that stayed">
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
        {/* Top-right ✦ */}
        <div
          style={{
            position: 'absolute',
            top: `${inset}px`,
            right: `${inset}px`,
            color: widgetTokens.amber,
            fontFamily: fonts.sans,
            fontSize: `${9 * scale}px`,
            lineHeight: 1,
          }}
        >
          ✦
        </div>

        {/* Quote row */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: `${20 * scale}px` }}>
          <div
            style={{
              width: `${3 * scale}px`,
              alignSelf: 'stretch',
              backgroundColor: widgetTokens.amber,
              borderRadius: `${1.5 * scale}px`,
            }}
          />
          <p
            style={{
              color: t.text,
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              fontSize: `${16 * scale}px`,
              lineHeight: 1.32,
              margin: 0,
              flex: 1,
              paddingRight: `${14 * scale}px`,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {line}
          </p>
        </div>

        {/* Hairline */}
        <div
          style={{
            height: '1px',
            backgroundColor: widgetTokens.amber,
            opacity: 0.4,
            marginTop: `${8 * scale}px`,
          }}
        />

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: `${6 * scale}px`,
          }}
        >
          <span
            style={{
              color: t.muted,
              fontFamily: fonts.sans,
              fontSize: `${9 * scale}px`,
            }}
          >
            {source}
          </span>
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onReadFull?.();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: widgetTokens.amber,
              fontFamily: fonts.sans,
              fontSize: `${9 * scale}px`,
              fontWeight: 600,
              cursor: onReadFull ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            {cta}
          </button>
        </div>
      </div>
    </MediumWidgetFrame>
  );
}
