import { WidgetFrame } from './WidgetFrame';
import { BASE_INSET, WidgetTheme, fonts, resolveTheme, widgetTokens } from './tokens';

export interface DoorOpenProps {
  primary?: string;
  secondary?: string;
  theme?: WidgetTheme;
  scale?: number;
  onTap?: () => void;
}

export function DoorOpen({
  primary = 'A letter is waiting.',
  secondary = "Come back when you're ready.",
  theme = 'light',
  scale = 1,
  onTap,
}: DoorOpenProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;

  const envW = 60 * scale;
  const envH = 44 * scale;
  const sealSize = 10 * scale;

  return (
    <WidgetFrame background={t.bg} scale={scale} onTap={onTap} ariaLabel="A letter is waiting">
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: `${inset}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${7 * scale}px`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'relative', width: `${envW}px`, height: `${envH}px` }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: t.envelope,
              borderRadius: `${2 * scale}px`,
            }}
          />
          <svg
            viewBox="0 0 60 44"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <path
              d="M 0 3 L 30 25 L 60 3"
              stroke={widgetTokens.amber}
              strokeOpacity="0.6"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            style={{
              position: 'absolute',
              left: '50%',
              bottom: `-${sealSize / 2}px`,
              transform: 'translateX(-50%)',
              width: `${sealSize}px`,
              height: `${sealSize}px`,
              borderRadius: '50%',
              backgroundColor: widgetTokens.amber,
            }}
          />
        </div>

        <div
          style={{
            marginTop: `${5 * scale}px`,
            color: t.muted,
            fontFamily: fonts.sans,
            fontSize: `${10 * scale}px`,
          }}
        >
          {primary}
        </div>
        <div
          style={{
            color: t.text,
            fontFamily: fonts.serif,
            fontStyle: 'italic',
            fontSize: `${11 * scale}px`,
            textAlign: 'center',
            lineHeight: 1.25,
          }}
        >
          {secondary}
        </div>
      </div>
    </WidgetFrame>
  );
}
