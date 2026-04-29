import { WidgetFrame } from './WidgetFrame';
import { BASE_INSET, WidgetTheme, fonts, resolveTheme, widgetTokens } from './tokens';

export interface LineThatStayedProps {
  line?: string;
  source?: string;
  theme?: WidgetTheme;
  scale?: number;
  onTap?: () => void;
}

export function LineThatStayed({
  line = "Even on a good day I forget to rest in this. That's what I needed to hear.",
  source = 'From your letter · Apr 24',
  theme = 'light',
  scale = 1,
  onTap,
}: LineThatStayedProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;

  return (
    <WidgetFrame background={t.bg} scale={scale} onTap={onTap} ariaLabel="The line that stayed">
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
        <div
          style={{
            position: 'absolute',
            top: `${inset}px`,
            right: `${inset}px`,
            color: widgetTokens.amber,
            fontFamily: fonts.sans,
            fontSize: `${8 * scale}px`,
            lineHeight: 1,
          }}
        >
          ✦
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: `${16 * scale}px` }}>
          <div
            style={{
              width: `${2 * scale}px`,
              alignSelf: 'stretch',
              backgroundColor: widgetTokens.amber,
              borderRadius: `${1 * scale}px`,
            }}
          />
          <p
            style={{
              color: t.text,
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              fontSize: `${13 * scale}px`,
              lineHeight: 1.3,
              margin: 0,
              flex: 1,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {line}
          </p>
        </div>

        <div
          style={{
            color: t.muted,
            fontFamily: fonts.sans,
            fontSize: `${9 * scale}px`,
            textAlign: 'right',
            marginTop: `${4 * scale}px`,
          }}
        >
          {source}
        </div>
      </div>
    </WidgetFrame>
  );
}
