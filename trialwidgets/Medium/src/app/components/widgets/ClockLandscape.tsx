import { useEffect, useState } from 'react';
import { MediumWidgetFrame } from './MediumWidgetFrame';
import { BASE_INSET, WidgetTheme, fonts, resolveTheme, widgetTokens } from './tokens';

export type LandscapeScene =
  | 'calvary'
  | 'gethsemane'
  | 'galilee'
  | 'sinai'
  | 'bethlehem'
  | 'jordan'
  | 'wilderness'
  | 'eden'
  | 'olives'
  | 'emmaus';

export const LANDSCAPE_SCENES: LandscapeScene[] = [
  'calvary',
  'gethsemane',
  'galilee',
  'sinai',
  'bethlehem',
  'jordan',
  'wilderness',
  'eden',
  'olives',
  'emmaus',
];

interface SceneCopy {
  name: string;
  verse: string;
  reference: string;
}

const SCENE_COPY: Record<LandscapeScene, SceneCopy> = {
  calvary:    { name: 'Calvary',          verse: 'It is finished.',                       reference: 'John 19:30' },
  gethsemane: { name: 'Gethsemane',       verse: 'Not my will, but yours be done.',       reference: 'Luke 22:42' },
  galilee:    { name: 'Sea of Galilee',   verse: 'Peace, be still.',                      reference: 'Mark 4:39' },
  sinai:      { name: 'Mount Sinai',      verse: 'Be still, and know that I am God.',     reference: 'Psalm 46:10' },
  bethlehem:  { name: 'Bethlehem',        verse: 'Unto you is born this day a Savior.',   reference: 'Luke 2:11' },
  jordan:     { name: 'Jordan River',     verse: 'This is my beloved Son.',               reference: 'Matthew 3:17' },
  wilderness: { name: 'Wilderness',       verse: 'He leads me beside still waters.',      reference: 'Psalm 23:2' },
  eden:       { name: 'Garden of Eden',   verse: 'And God saw that it was good.',         reference: 'Genesis 1:31' },
  olives:     { name: 'Mount of Olives',  verse: 'Lo, I am with you always.',             reference: 'Matthew 28:20' },
  emmaus:     { name: 'Emmaus Road',      verse: 'Did not our hearts burn within us?',    reference: 'Luke 24:32' },
};

export interface ClockLandscapeProps {
  scene?: LandscapeScene;
  /** When uncontrolled, taps advance through scenes. Default true. */
  cycleOnTap?: boolean;
  /** Fixed time for static rendering. Default: live clock when animated. */
  time?: Date;
  theme?: WidgetTheme;
  scale?: number;
  animated?: boolean;
  onTap?: () => void;
  onSceneChange?: (s: LandscapeScene) => void;
}

export function ClockLandscape({
  scene,
  cycleOnTap = true,
  time,
  theme = 'light',
  scale = 1,
  animated = true,
  onTap,
  onSceneChange,
}: ClockLandscapeProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;

  const [internalScene, setInternalScene] = useState<LandscapeScene>(scene ?? 'calvary');
  const activeScene = scene ?? internalScene;

  const [now, setNow] = useState<Date>(time ?? new Date());
  useEffect(() => {
    if (time || !animated) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [time, animated]);
  const displayTime = time ?? now;

  const handleTap = () => {
    onTap?.();
    if (cycleOnTap && !scene) {
      const i = LANDSCAPE_SCENES.indexOf(activeScene);
      const next = LANDSCAPE_SCENES[(i + 1) % LANDSCAPE_SCENES.length];
      setInternalScene(next);
      onSceneChange?.(next);
    }
  };

  const copy = SCENE_COPY[activeScene];

  return (
    <MediumWidgetFrame background={t.card} scale={scale} onTap={handleTap} ariaLabel={`Clock and ${copy.name}`}>
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: `${inset}px`,
          display: 'flex',
          gap: `${12 * scale}px`,
          boxSizing: 'border-box',
        }}
      >
        {/* Left: analog clock */}
        <div
          style={{
            width: '40%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${6 * scale}px`,
          }}
        >
          <AnalogClock size={92 * scale} mode={mode} time={displayTime} />
          <div
            style={{
              color: widgetTokens.amber,
              fontFamily: fonts.sans,
              fontSize: `${9 * scale}px`,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {formatHHMM(displayTime)}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '0.5px',
            backgroundColor: widgetTokens.light.rule,
            margin: `${10 * scale}px 0`,
            opacity: mode === 'dark' ? 0.4 : 1,
          }}
        />

        {/* Right: landscape + verse */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingLeft: `${4 * scale}px`,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${56 * scale}px`,
              borderRadius: `${10 * scale}px`,
              overflow: 'hidden',
              background:
                mode === 'dark'
                  ? 'linear-gradient(180deg, #1C1712 0%, #2A2319 100%)'
                  : 'linear-gradient(180deg, #FAF0DC 0%, #F5E6CC 100%)',
            }}
          >
            <Landscape scene={activeScene} mode={mode} />
          </div>
          <div style={{ marginTop: `${6 * scale}px` }}>
            <p
              style={{
                color: t.text,
                fontFamily: fonts.serif,
                fontStyle: 'italic',
                fontSize: `${11.5 * scale}px`,
                lineHeight: 1.28,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              “{copy.verse}”
            </p>
            <div
              style={{
                marginTop: `${3 * scale}px`,
                color: widgetTokens.amber,
                fontFamily: fonts.sans,
                fontSize: `${9 * scale}px`,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {copy.reference}
            </div>
          </div>
        </div>
      </div>
    </MediumWidgetFrame>
  );
}

function formatHHMM(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const hh = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/* ---------- Analog clock ---------- */
function AnalogClock({ size, mode, time }: { size: number; mode: 'light' | 'dark'; time: Date }) {
  const face = mode === 'dark' ? '#1C1712' : '#FAF0DC';
  const ring = widgetTokens.amber;
  const tick = mode === 'dark' ? '#A09080' : '#A09080';
  const hand = mode === 'dark' ? '#EDE8DF' : '#3D2F2A';

  const h = time.getHours() % 12;
  const m = time.getMinutes();
  const s = time.getSeconds();
  const hourDeg = (h + m / 60) * 30;
  const minDeg = (m + s / 60) * 6;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {/* Face */}
      <circle cx="50" cy="50" r="46" fill={face} stroke={ring} strokeWidth="1.5" />
      {/* Ticks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const r1 = 40;
        const r2 = i % 3 === 0 ? 33 : 36;
        const x1 = 50 + Math.sin(a) * r1;
        const y1 = 50 - Math.cos(a) * r1;
        const x2 = 50 + Math.sin(a) * r2;
        const y2 = 50 - Math.cos(a) * r2;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={i % 3 === 0 ? ring : tick}
            strokeWidth={i % 3 === 0 ? 1.6 : 0.9}
            strokeLinecap="round"
            opacity={i % 3 === 0 ? 0.9 : 0.5}
          />
        );
      })}
      {/* Hour hand */}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="28"
        stroke={hand}
        strokeWidth="2.6"
        strokeLinecap="round"
        transform={`rotate(${hourDeg} 50 50)`}
      />
      {/* Minute hand */}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="18"
        stroke={hand}
        strokeWidth="1.8"
        strokeLinecap="round"
        transform={`rotate(${minDeg} 50 50)`}
      />
      {/* Center cap */}
      <circle cx="50" cy="50" r="2.2" fill={ring} />
    </svg>
  );
}

/* ---------- Landscape SVGs (viewBox 0 0 200 60) ---------- */
function Landscape({ scene, mode }: { scene: LandscapeScene; mode: 'light' | 'dark' }) {
  return (
    <svg viewBox="0 0 200 60" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      {scene === 'calvary' && <Calvary mode={mode} />}
      {scene === 'gethsemane' && <Gethsemane mode={mode} />}
      {scene === 'galilee' && <Galilee mode={mode} />}
      {scene === 'sinai' && <Sinai mode={mode} />}
      {scene === 'bethlehem' && <Bethlehem mode={mode} />}
      {scene === 'jordan' && <Jordan mode={mode} />}
      {scene === 'wilderness' && <Wilderness mode={mode} />}
      {scene === 'eden' && <Eden mode={mode} />}
      {scene === 'olives' && <Olives mode={mode} />}
      {scene === 'emmaus' && <Emmaus mode={mode} />}
    </svg>
  );
}

function Calvary({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#3D2F2A' : '#E5A56A';
  const hill = mode === 'dark' ? '#1C1712' : '#9C7C5A';
  const cross = mode === 'dark' ? '#1C1712' : '#3D2F2A';
  return (
    <g>
      <rect x="0" y="0" width="200" height="60" fill={sky} opacity="0.55" />
      <circle cx="160" cy="22" r="9" fill="#C4956A" opacity="0.55" />
      <path d="M 0 50 Q 100 32 200 48 L 200 60 L 0 60 Z" fill={hill} />
      {/* Three crosses */}
      <g fill={cross}>
        <rect x="86" y="28" width="2" height="22" />
        <rect x="80" y="34" width="14" height="2" />
        <rect x="100" y="22" width="2.4" height="28" />
        <rect x="92" y="29" width="18" height="2.4" />
        <rect x="116" y="28" width="2" height="22" />
        <rect x="110" y="34" width="14" height="2" />
      </g>
    </g>
  );
}

function Gethsemane({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#1C1712' : '#3D4A5C';
  const ground = mode === 'dark' ? '#0F0E0C' : '#5A6E5A';
  const tree = mode === 'dark' ? '#2A3A2A' : '#3D5A3D';
  return (
    <g>
      <rect x="0" y="0" width="200" height="60" fill={sky} opacity="0.7" />
      <circle cx="40" cy="14" r="7" fill="#EDE8DF" opacity="0.85" />
      <path d="M 0 48 Q 100 42 200 50 L 200 60 L 0 60 Z" fill={ground} />
      {/* Olive trees */}
      {[60, 95, 130, 160].map((x, i) => (
        <g key={i}>
          <rect x={x} y="38" width="2" height="12" fill="#3D2F2A" />
          <ellipse cx={x + 1} cy="36" rx="9" ry="7" fill={tree} />
          <ellipse cx={x + 1} cy="34" rx="6" ry="4" fill={tree} opacity="0.7" />
        </g>
      ))}
    </g>
  );
}

function Galilee({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#2A2319' : '#FAE5C8';
  const water = mode === 'dark' ? '#3D4A5C' : '#9CB5C4';
  const hill = mode === 'dark' ? '#1C1712' : '#7A8E6A';
  return (
    <g>
      <rect x="0" y="0" width="200" height="60" fill={sky} />
      <circle cx="50" cy="22" r="6" fill="#E5A56A" opacity="0.7" />
      {/* Far hills */}
      <path d="M 0 32 Q 50 24 100 30 Q 150 24 200 32 L 200 38 L 0 38 Z" fill={hill} opacity="0.7" />
      {/* Water */}
      <rect x="0" y="38" width="200" height="22" fill={water} />
      <line x1="20" y1="44" x2="60" y2="44" stroke="#FAF8F5" strokeWidth="0.5" opacity="0.5" />
      <line x1="80" y1="50" x2="120" y2="50" stroke="#FAF8F5" strokeWidth="0.5" opacity="0.4" />
      <line x1="140" y1="46" x2="180" y2="46" stroke="#FAF8F5" strokeWidth="0.5" opacity="0.5" />
      {/* Boat */}
      <path d="M 110 48 L 134 48 L 130 52 L 114 52 Z" fill="#3D2F2A" />
      <line x1="122" y1="48" x2="122" y2="38" stroke="#3D2F2A" strokeWidth="0.8" />
      <path d="M 122 38 L 130 48 L 122 48 Z" fill="#FAF8F5" opacity="0.85" />
    </g>
  );
}

function Sinai({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#2A2319' : '#3D5A6A';
  const peak = mode === 'dark' ? '#1C1712' : '#7A6B5E';
  const peak2 = mode === 'dark' ? '#0F0E0C' : '#5A4632';
  return (
    <g>
      <rect x="0" y="0" width="200" height="60" fill={sky} opacity="0.7" />
      {/* Clouds parting */}
      <ellipse cx="60" cy="14" rx="22" ry="5" fill="#EDE8DF" opacity="0.7" />
      <ellipse cx="140" cy="16" rx="26" ry="5" fill="#EDE8DF" opacity="0.6" />
      {/* Lightning */}
      <path d="M 100 18 L 96 28 L 102 28 L 98 38" stroke="#E5C39A" strokeWidth="1" fill="none" />
      {/* Peaks */}
      <path d="M 0 60 L 50 38 L 80 50 L 100 26 L 130 48 L 160 36 L 200 60 Z" fill={peak2} />
      <path d="M 0 60 L 60 44 L 100 32 L 140 48 L 200 60 Z" fill={peak} opacity="0.85" />
    </g>
  );
}

function Bethlehem({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#0F0E0C' : '#1C1712';
  const town = mode === 'dark' ? '#3D2F2A' : '#5A4632';
  return (
    <g>
      <rect x="0" y="0" width="200" height="60" fill={sky} />
      {/* Stars */}
      <circle cx="40" cy="14" r="0.6" fill="#EDE8DF" opacity="0.7" />
      <circle cx="80" cy="8" r="0.5" fill="#EDE8DF" opacity="0.6" />
      <circle cx="160" cy="12" r="0.6" fill="#EDE8DF" opacity="0.7" />
      <circle cx="180" cy="20" r="0.5" fill="#EDE8DF" opacity="0.5" />
      {/* Bright star */}
      <g>
        <circle cx="120" cy="16" r="2.4" fill="#F3D29A" />
        <path d="M 120 8 L 120 24 M 112 16 L 128 16 M 114 10 L 126 22 M 126 10 L 114 22" stroke="#F3D29A" strokeWidth="0.6" opacity="0.8" />
      </g>
      {/* Hills */}
      <path d="M 0 50 Q 60 42 120 48 Q 170 42 200 50 L 200 60 L 0 60 Z" fill={town} opacity="0.6" />
      {/* Town silhouette */}
      <g fill={town}>
        <rect x="86" y="42" width="6" height="10" />
        <rect x="92" y="38" width="8" height="14" />
        <rect x="100" y="44" width="5" height="8" />
        <rect x="105" y="40" width="7" height="12" />
        <path d="M 95 38 L 96 35 L 97 38 Z" fill="#C4956A" />
        <rect x="113" y="42" width="6" height="10" />
        <rect x="119" y="44" width="5" height="8" />
        <rect x="124" y="40" width="6" height="12" />
      </g>
    </g>
  );
}

function Jordan({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#2A2319' : '#FAE5C8';
  const bank = mode === 'dark' ? '#1C1712' : '#9C7C5A';
  const water = mode === 'dark' ? '#3D5A6A' : '#7A95B0';
  const reed = mode === 'dark' ? '#5A6E4A' : '#7A8E6A';
  return (
    <g>
      <rect x="0" y="0" width="200" height="60" fill={sky} />
      <circle cx="40" cy="14" r="6" fill="#E5C39A" opacity="0.7" />
      <path d="M 0 36 Q 50 30 100 36 Q 150 42 200 36 L 200 60 L 0 60 Z" fill={bank} opacity="0.6" />
      {/* Winding water */}
      <path d="M 0 44 Q 50 38 100 46 Q 150 54 200 46 L 200 56 Q 150 60 100 54 Q 50 50 0 56 Z" fill={water} />
      {/* Reeds */}
      {[20, 35, 165, 180].map((x, i) => (
        <g key={i} stroke={reed} strokeWidth="0.7" strokeLinecap="round">
          <line x1={x} y1="44" x2={x - 1} y2="36" />
          <line x1={x + 2} y1="44" x2={x + 3} y2="34" />
          <line x1={x - 2} y1="44" x2={x - 3} y2="38" />
        </g>
      ))}
      {/* Dove descending */}
      <g>
        <ellipse cx="120" cy="20" rx="3" ry="1.6" fill="#FAF8F5" />
        <circle cx="123" cy="19.5" r="1.2" fill="#FAF8F5" />
        <path d="M 117 20 L 113 18 L 115 21 Z" fill="#FAF8F5" />
      </g>
    </g>
  );
}

function Wilderness({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#2A2319' : '#FAE5C8';
  const dune1 = mode === 'dark' ? '#3D2F2A' : '#D6B48A';
  const dune2 = mode === 'dark' ? '#1C1712' : '#B89668';
  const path = mode === 'dark' ? '#5A4632' : '#EDE0C8';
  return (
    <g>
      <rect x="0" y="0" width="200" height="60" fill={sky} />
      <circle cx="160" cy="18" r="7" fill="#E5A56A" opacity="0.7" />
      <path d="M 0 46 Q 60 36 130 44 Q 170 50 200 42 L 200 60 L 0 60 Z" fill={dune2} />
      <path d="M 0 52 Q 70 44 140 52 Q 180 56 200 50 L 200 60 L 0 60 Z" fill={dune1} />
      {/* Path */}
      <path d="M 100 60 Q 102 54 96 50 Q 90 46 94 42" stroke={path} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.85" />
    </g>
  );
}

function Eden({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#1C2A1C' : '#C4DBA8';
  const ground = mode === 'dark' ? '#1C1712' : '#7A8E5E';
  const leaf = mode === 'dark' ? '#3D5A3D' : '#5A8E4A';
  const trunk = '#5A4632';
  return (
    <g>
      <rect x="0" y="0" width="200" height="60" fill={sky} />
      <circle cx="160" cy="14" r="7" fill="#FAE5A0" opacity="0.7" />
      <path d="M 0 46 Q 100 40 200 46 L 200 60 L 0 60 Z" fill={ground} />
      {/* Tree of life center */}
      <rect x="98" y="30" width="4" height="18" fill={trunk} />
      <circle cx="100" cy="26" r="14" fill={leaf} />
      <circle cx="92" cy="22" r="7" fill={leaf} />
      <circle cx="108" cy="22" r="7" fill={leaf} />
      <circle cx="100" cy="18" r="6" fill={leaf} opacity="0.9" />
      {/* Fruit */}
      <circle cx="96" cy="26" r="1.4" fill="#C4956A" />
      <circle cx="104" cy="24" r="1.4" fill="#C4956A" />
      <circle cx="100" cy="30" r="1.4" fill="#C4956A" />
      {/* Side trees */}
      <g>
        <rect x="40" y="38" width="2" height="10" fill={trunk} />
        <circle cx="41" cy="36" r="6" fill={leaf} />
      </g>
      <g>
        <rect x="158" y="38" width="2" height="10" fill={trunk} />
        <circle cx="159" cy="36" r="6" fill={leaf} />
      </g>
      {/* River */}
      <path d="M 0 54 Q 60 50 100 54 Q 140 58 200 54 L 200 56 Q 140 60 100 56 Q 60 52 0 56 Z" fill="#7A95B0" opacity="0.7" />
    </g>
  );
}

function Olives({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#2A2319' : '#E5A56A';
  const hill = mode === 'dark' ? '#1C1712' : '#7A6B5E';
  const tree = mode === 'dark' ? '#2A3A2A' : '#5A7A4A';
  return (
    <g>
      <rect x="0" y="0" width="200" height="60" fill={sky} opacity="0.6" />
      <circle cx="30" cy="16" r="7" fill="#F3D29A" opacity="0.6" />
      <path d="M 0 42 Q 60 24 120 36 Q 170 44 200 38 L 200 60 L 0 60 Z" fill={hill} />
      {/* Olive grove on hilltop */}
      {[70, 88, 106, 124].map((x, i) => (
        <g key={i}>
          <rect x={x} y="32" width="1.6" height="8" fill="#3D2F2A" />
          <ellipse cx={x + 0.8} cy="30" rx="6" ry="5" fill={tree} />
        </g>
      ))}
      {/* Jerusalem distant */}
      <g fill={mode === 'dark' ? '#3D2F2A' : '#C4956A'} opacity="0.7">
        <rect x="160" y="40" width="4" height="6" />
        <rect x="166" y="38" width="5" height="8" />
        <rect x="173" y="40" width="4" height="6" />
        <rect x="179" y="36" width="6" height="10" />
      </g>
    </g>
  );
}

function Emmaus({ mode }: { mode: 'light' | 'dark' }) {
  const sky = mode === 'dark' ? '#3D2F2A' : '#FAE5A0';
  const sky2 = mode === 'dark' ? '#1C1712' : '#E5A56A';
  const ground = mode === 'dark' ? '#1C1712' : '#9C7C5A';
  const path = mode === 'dark' ? '#5A4632' : '#EDE0C8';
  return (
    <g>
      <defs>
        <linearGradient id="emmaus-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky} />
          <stop offset="100%" stopColor={sky2} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="60" fill="url(#emmaus-sky)" />
      <circle cx="100" cy="28" r="9" fill="#F3D29A" opacity="0.85" />
      <circle cx="100" cy="28" r="14" fill="#F3D29A" opacity="0.25" />
      <path d="M 0 44 Q 100 38 200 46 L 200 60 L 0 60 Z" fill={ground} />
      {/* Winding path */}
      <path d="M 100 60 Q 104 52 100 46 Q 96 40 100 34" stroke={path} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.85" />
      {/* Two figures walking */}
      <g fill="#3D2F2A">
        <ellipse cx="92" cy="46" rx="2" ry="3" />
        <rect x="91" y="44" width="2" height="6" />
        <ellipse cx="96" cy="46" rx="2" ry="3" />
        <rect x="95" y="44" width="2" height="6" />
      </g>
    </g>
  );
}
