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

export type DotState =
  | { kind: 'letter'; emotion: Emotion }
  | { kind: 'checkin'; emotion: Emotion }
  | { kind: 'none' };

export interface EmotionMosaicProps {
  // 6 weeks × 7 days. weeks[0] is W1 (oldest), weeks[5] is W6 (this week).
  weeks?: DotState[][];
  todayWeekIndex?: number;
  todayDayIndex?: number;
  count?: number;
  countLabel?: string;
  theme?: WidgetTheme;
  scale?: number;
  onTap?: () => void;
}

const DEFAULT_WEEKS: DotState[][] = (() => {
  const e: Emotion[] = ['stressed', 'tired', 'sad', 'neutral', 'good'];
  const seed = [
    [1, 0, 2, 0, 4, 0, 0],
    [0, 1, 1, 0, 3, 4, 0],
    [2, 0, 0, 1, 0, 4, 0],
    [0, 3, 0, 0, 2, 0, 4],
    [1, 0, 1, 4, 0, 0, 3],
    [4, 0, 1, 0, 0, 0, 0],
  ];
  // 0 = none, 1 = checkin, 2-6 = letter with emotion idx (2..6 → e[0..4])
  return seed.map((row) =>
    row.map<DotState>((v) => {
      if (v === 0) return { kind: 'none' };
      if (v === 1) return { kind: 'checkin', emotion: 'neutral' };
      return { kind: 'letter', emotion: e[(v - 2) % e.length] };
    })
  );
})();

export function EmotionMosaic({
  weeks = DEFAULT_WEEKS,
  todayWeekIndex = 5,
  todayDayIndex = 0,
  count = 6,
  countLabel = 'letters written',
  theme = 'light',
  scale = 1,
  onTap,
}: EmotionMosaicProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;
  const labelColor = mode === 'dark' ? '#5A5048' : t.muted;

  const dotSize = 8 * scale;
  const gap = 6 * scale;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <MediumWidgetFrame background={t.bg} scale={scale} onTap={onTap} ariaLabel="Emotion mosaic">
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: `${inset}px`,
          display: 'flex',
          gap: `${10 * scale}px`,
          boxSizing: 'border-box',
        }}
      >
        {/* Left column — week labels */}
        <div
          style={{
            width: '14%',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: `${10 * scale}px`,
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              style={{
                color: labelColor,
                fontFamily: fonts.sans,
                fontSize: `${8 * scale}px`,
                letterSpacing: '0.04em',
              }}
            >
              W{i + 1}
            </span>
          ))}
        </div>

        {/* Right grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Day headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(7, ${dotSize}px)`,
              columnGap: `${gap}px`,
              marginBottom: `${5 * scale}px`,
            }}
          >
            {days.map((d, i) => (
              <span
                key={i}
                style={{
                  color: labelColor,
                  fontFamily: fonts.sans,
                  fontSize: `${7 * scale}px`,
                  textAlign: 'center',
                  width: `${dotSize}px`,
                }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Dot grid */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              paddingBottom: `${2 * scale}px`,
            }}
          >
            {weeks.map((row, w) => (
              <div
                key={w}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(7, ${dotSize}px)`,
                  columnGap: `${gap}px`,
                  alignItems: 'center',
                }}
              >
                {row.map((cell, d) => {
                  const isToday = w === todayWeekIndex && d === todayDayIndex;
                  if (cell.kind === 'none' && !isToday) {
                    return (
                      <div key={d} style={{ width: `${dotSize}px`, height: `${dotSize}px` }} />
                    );
                  }
                  const color =
                    cell.kind === 'none' ? widgetTokens.amber : emotionColors[cell.emotion];
                  const opacity = cell.kind === 'checkin' ? 0.25 : 1;
                  return (
                    <div
                      key={d}
                      style={{
                        width: `${dotSize}px`,
                        height: `${dotSize}px`,
                        borderRadius: '50%',
                        backgroundColor: color,
                        opacity,
                        boxShadow: isToday
                          ? `0 0 0 ${1.5 * scale}px ${widgetTokens.amber}`
                          : 'none',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              color: t.muted,
              fontFamily: fonts.sans,
              fontSize: `${8 * scale}px`,
              marginTop: `${4 * scale}px`,
            }}
          >
            {count} {countLabel}
          </div>
        </div>
      </div>
    </MediumWidgetFrame>
  );
}
