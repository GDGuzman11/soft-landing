import { MediumWidgetFrame } from './MediumWidgetFrame';
import { BASE_INSET, WidgetTheme, fonts, resolveTheme, widgetTokens } from './tokens';

export interface ThisOneIsForYouProps {
  reference?: string;
  text?: string;
  buttonLabel?: string;
  caption?: string;
  badge?: string;
  theme?: WidgetTheme;
  scale?: number;
  onOpen?: () => void;
  onTap?: () => void;
}

export function ThisOneIsForYou({
  reference = 'PSALM 147:3',
  text = 'He heals the broken-hearted and binds up their wounds.',
  buttonLabel = 'Open it →',
  caption = 'Your verse for today is ready.',
  badge = 'JUST FOR YOU',
  theme = 'light',
  scale = 1,
  onOpen,
  onTap,
}: ThisOneIsForYouProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;
  const envelopeBg = mode === 'dark' ? '#1C1712' : '#FAF8F5';

  return (
    <MediumWidgetFrame background={t.card} scale={scale} onTap={onTap} ariaLabel="Your verse is ready">
      <div style={{ width: '100%', height: '100%', padding: `${inset}px`, display: 'flex', boxSizing: 'border-box' }}>
        {/* Left column 40% */}
        <div
          style={{
            width: '40%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${10 * scale}px`,
          }}
        >
          {/* Envelope 68×52pt */}
          <div style={{ position: 'relative', width: `${68 * scale}px`, height: `${52 * scale}px` }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: envelopeBg,
                borderRadius: `${3 * scale}px`,
              }}
            />
            <svg
              viewBox="0 0 68 52"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              <path
                d="M 0 4 L 34 30 L 68 4"
                stroke={widgetTokens.amber}
                strokeWidth="1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* Wax seal 14pt with embossed ✦ */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: `-${7 * scale}px`,
                transform: 'translateX(-50%)',
                width: `${14 * scale}px`,
                height: `${14 * scale}px`,
                borderRadius: '50%',
                backgroundColor: widgetTokens.amber,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FAF8F5',
                fontFamily: fonts.sans,
                fontSize: `${8 * scale}px`,
                lineHeight: 1,
              }}
            >
              ✦
            </div>
          </div>

          <div
            style={{
              marginTop: `${8 * scale}px`,
              color: widgetTokens.amber,
              fontFamily: fonts.sans,
              fontSize: `${9 * scale}px`,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {badge}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '0.5px',
            backgroundColor: widgetTokens.light.rule,
            margin: `${12 * scale}px 0`,
            opacity: mode === 'dark' ? 0.4 : 1,
          }}
        />

        {/* Right column 60% */}
        <div
          style={{
            flex: 1,
            paddingLeft: `${14 * scale}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                color: t.muted,
                fontFamily: fonts.sans,
                fontSize: `${10 * scale}px`,
                marginBottom: `${6 * scale}px`,
              }}
            >
              {caption}
            </div>
            <p
              style={{
                color: t.text,
                fontFamily: fonts.serif,
                fontStyle: 'italic',
                fontSize: `${13 * scale}px`,
                lineHeight: 1.32,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {text}
            </p>
            <div
              style={{
                marginTop: `${6 * scale}px`,
                color: widgetTokens.amber,
                fontFamily: fonts.sans,
                fontSize: `${9 * scale}px`,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {reference.toUpperCase()}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                onOpen?.();
              }}
              style={{
                width: `${80 * scale}px`,
                height: `${28 * scale}px`,
                borderRadius: `${14 * scale}px`,
                backgroundColor: widgetTokens.amber,
                color: '#FFFFFF',
                fontFamily: fonts.sans,
                fontSize: `${10 * scale}px`,
                fontWeight: 600,
                border: 'none',
                cursor: onOpen ? 'pointer' : 'default',
                padding: 0,
              }}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </MediumWidgetFrame>
  );
}
