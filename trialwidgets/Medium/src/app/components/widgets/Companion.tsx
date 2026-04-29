import { useState } from 'react';
import { MediumWidgetFrame } from './MediumWidgetFrame';
import { BASE_INSET, WidgetTheme, fonts, resolveTheme, widgetTokens } from './tokens';

export type HapticStrength = 'light' | 'medium' | 'heavy';

const HAPTIC_PATTERNS: Record<HapticStrength, number | number[]> = {
  light: 10,
  medium: [10, 30, 10],
  heavy: [15, 40, 15, 40, 15],
};

interface Reaction {
  id: string;
  anim: string;
  duration: number;
  haptic: HapticStrength;
  emote?: string;
}

/**
 * 10 unique reactions per animal — each set tuned to the animal's character.
 * Movements are calming, never frantic. Emotes reinforce connection (♡, ✦, ?).
 * Animation names map to keyframes in CompanionStyles.
 */
const REACTIONS_BY_PET: Record<CompanionPet, Reaction[]> = {
  // ========== LAMB — innocent, gentle, peaceful ==========
  lamb: [
    { id: 'hop',       anim: 'sl-mv-lamb-hop',     duration: 700,  haptic: 'light' },
    { id: 'walkRight', anim: 'sl-mv-lamb-walk-r',  duration: 1400, haptic: 'light' },
    { id: 'walkLeft',  anim: 'sl-mv-lamb-walk-l',  duration: 1400, haptic: 'light' },
    { id: 'bow',       anim: 'sl-mv-bow',          duration: 900,  haptic: 'light' },
    { id: 'nod',       anim: 'sl-mv-nod',          duration: 700,  haptic: 'light' },
    { id: 'sway',      anim: 'sl-mv-sway-gentle',  duration: 1200, haptic: 'light' },
    { id: 'curious',   anim: 'sl-mv-tilt-curious', duration: 1000, haptic: 'light', emote: '?' },
    { id: 'settle',    anim: 'sl-mv-settle',       duration: 1200, haptic: 'light' },
    { id: 'snuggle',   anim: 'sl-mv-grow-warm',    duration: 1100, haptic: 'light', emote: '♡' },
    { id: 'coo',       anim: 'sl-mv-coo',          duration: 1000, haptic: 'light' },
    { id: 'lookUp',    anim: 'sl-mv-look-up',      duration: 1000, haptic: 'light', emote: '✦' },
  ],

  // ========== DOVE — graceful, peaceful, ethereal ==========
  dove: [
    { id: 'flutter',   anim: 'sl-mv-flutter',     duration: 1000, haptic: 'light' },
    { id: 'lift',      anim: 'sl-mv-lift',        duration: 900,  haptic: 'light' },
    { id: 'coo',       anim: 'sl-mv-coo',         duration: 1100, haptic: 'light', emote: '♡' },
    { id: 'tiltSoft',  anim: 'sl-mv-tilt-curious',duration: 900,  haptic: 'light' },
    { id: 'sway',      anim: 'sl-mv-sway-gentle', duration: 1200, haptic: 'light' },
    { id: 'glideR',    anim: 'sl-mv-flit-right',  duration: 900,  haptic: 'light' },
    { id: 'glideL',    anim: 'sl-mv-flit-left',   duration: 900,  haptic: 'light' },
    { id: 'descend',   anim: 'sl-mv-settle',      duration: 1300, haptic: 'light' },
    { id: 'nod',       anim: 'sl-mv-nod',         duration: 700,  haptic: 'light' },
    { id: 'twirl',     anim: 'sl-mv-twirl',       duration: 1100, haptic: 'medium', emote: '✦' },
  ],

  // ========== SPARROW — quick, curious, small ==========
  sparrow: [
    { id: 'hop',       anim: 'sl-mv-hop-soft',    duration: 700,  haptic: 'light' },
    { id: 'doubleHop', anim: 'sl-mv-hop-double',  duration: 900,  haptic: 'light' },
    { id: 'prance',    anim: 'sl-mv-hop-prance',  duration: 1000, haptic: 'light' },
    { id: 'tiltShake', anim: 'sl-mv-tilt-shake',  duration: 700,  haptic: 'light' },
    { id: 'lookAround',anim: 'sl-mv-look-around', duration: 1100, haptic: 'light', emote: '?' },
    { id: 'dustShake', anim: 'sl-mv-dust-shake',  duration: 700,  haptic: 'medium' },
    { id: 'flitR',     anim: 'sl-mv-flit-right',  duration: 800,  haptic: 'light' },
    { id: 'flitL',     anim: 'sl-mv-flit-left',   duration: 800,  haptic: 'light' },
    { id: 'chirp',     anim: 'sl-mv-coo',         duration: 900,  haptic: 'light', emote: '♪' },
    { id: 'skitter',   anim: 'sl-mv-skitter',     duration: 700,  haptic: 'light' },
  ],

  // ========== LION — regal, calm, courageous ==========
  lion: [
    { id: 'nod',       anim: 'sl-mv-nod-deep',    duration: 900,  haptic: 'medium' },
    { id: 'turn',      anim: 'sl-mv-tilt-curious',duration: 1100, haptic: 'medium' },
    { id: 'roar',      anim: 'sl-mv-roar',        duration: 1000, haptic: 'heavy', emote: '✦' },
    { id: 'sway',      anim: 'sl-mv-sway-gentle', duration: 1300, haptic: 'light' },
    { id: 'riseTall',  anim: 'sl-mv-rise-tall',   duration: 1100, haptic: 'medium' },
    { id: 'tailSwish', anim: 'sl-mv-tail-swish',  duration: 1100, haptic: 'light' },
    { id: 'smile',     anim: 'sl-mv-grow-warm',   duration: 1100, haptic: 'light', emote: '♡' },
    { id: 'maneShake', anim: 'sl-mv-tilt-shake',  duration: 800,  haptic: 'medium' },
    { id: 'settle',    anim: 'sl-mv-settle',      duration: 1300, haptic: 'light' },
    { id: 'lookUp',    anim: 'sl-mv-look-up',     duration: 1000, haptic: 'light' },
  ],

  // ========== TIGER — powerful, attentive, watchful ==========
  tiger: [
    { id: 'watch',     anim: 'sl-mv-tilt-curious',duration: 1000, haptic: 'medium' },
    { id: 'stretch',   anim: 'sl-mv-stretch-fwd', duration: 1100, haptic: 'medium' },
    { id: 'tailSwish', anim: 'sl-mv-tail-swish',  duration: 1000, haptic: 'light' },
    { id: 'shake',     anim: 'sl-mv-tilt-shake',  duration: 700,  haptic: 'medium' },
    { id: 'dustShake', anim: 'sl-mv-dust-shake',  duration: 800,  haptic: 'medium' },
    { id: 'sway',      anim: 'sl-mv-sway-gentle', duration: 1200, haptic: 'light' },
    { id: 'nod',       anim: 'sl-mv-nod',         duration: 800,  haptic: 'medium' },
    { id: 'settle',    anim: 'sl-mv-settle',      duration: 1200, haptic: 'light' },
    { id: 'softGaze',  anim: 'sl-mv-grow-warm',   duration: 1100, haptic: 'light', emote: '♡' },
    { id: 'stalk',     anim: 'sl-mv-flit-right',  duration: 1000, haptic: 'medium' },
  ],

  // ========== ELEPHANT — gentle, slow, dignified ==========
  elephant: [
    { id: 'nod',       anim: 'sl-mv-nod-deep',    duration: 1100, haptic: 'medium' },
    { id: 'trumpet',   anim: 'sl-mv-trumpet',     duration: 1100, haptic: 'heavy', emote: '♪' },
    { id: 'sway',      anim: 'sl-mv-sway-gentle', duration: 1400, haptic: 'light' },
    { id: 'earFlap',   anim: 'sl-mv-sway-wide',   duration: 1100, haptic: 'medium' },
    { id: 'settle',    anim: 'sl-mv-settle',      duration: 1400, haptic: 'light' },
    { id: 'riseTall',  anim: 'sl-mv-rise-tall',   duration: 1200, haptic: 'medium' },
    { id: 'coo',       anim: 'sl-mv-coo',         duration: 1100, haptic: 'light' },
    { id: 'bow',       anim: 'sl-mv-bow',         duration: 1100, haptic: 'medium' },
    { id: 'spray',     anim: 'sl-mv-dust-shake',  duration: 900,  haptic: 'medium', emote: '✦' },
    { id: 'gentleGaze',anim: 'sl-mv-grow-warm',   duration: 1300, haptic: 'light', emote: '♡' },
  ],

  // ========== Inanimates — only thematic motions ==========
  flame: [
    { id: 'flarePulse', anim: 'sl-react-flarepulse', duration: 800,  haptic: 'medium', emote: '✦' },
    { id: 'flareSwell', anim: 'sl-react-flareswell', duration: 1000, haptic: 'light' },
    { id: 'flareSnap',  anim: 'sl-react-flaresnap',  duration: 600,  haptic: 'medium' },
  ],
  lantern: [
    { id: 'lanternSwing', anim: 'sl-react-lanternswing', duration: 1300, haptic: 'medium' },
    { id: 'lanternBob',   anim: 'sl-react-lanternbob',   duration: 1000, haptic: 'light' },
    { id: 'lanternGlow',  anim: 'sl-react-lanternglow',  duration: 1100, haptic: 'light',  emote: '✦' },
  ],
  burningBush: [
    { id: 'bushBurst',   anim: 'sl-react-bushburst',   duration: 900,  haptic: 'heavy', emote: '✦' },
    { id: 'bushShimmer', anim: 'sl-react-bushshimmer', duration: 1100, haptic: 'medium' },
    { id: 'bushKindle',  anim: 'sl-react-bushkindle',  duration: 800,  haptic: 'medium' },
  ],
};

function pickReaction(pet: CompanionPet, lastId: string | null): Reaction {
  const pool = REACTIONS_BY_PET[pet];
  if (pool.length === 1) return pool[0];
  let next = pool[Math.floor(Math.random() * pool.length)];
  if (lastId && next.id === lastId) {
    const i = pool.findIndex((r) => r.id === lastId);
    next = pool[(i + 1) % pool.length];
  }
  return next;
}

function fireHaptic(strength: HapticStrength) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[strength]);
  } catch {
    /* ignore */
  }
}

export type CompanionPet =
  | 'lamb'
  | 'dove'
  | 'sparrow'
  | 'flame'
  | 'lantern'
  | 'lion'
  | 'tiger'
  | 'elephant'
  | 'burningBush';

export interface CompanionProps {
  pet?: CompanionPet;
  name?: string;
  line?: string;
  state?: string;
  theme?: WidgetTheme;
  scale?: number;
  /** When false, renders a static frame (use for iOS widget timeline). Default true. */
  animated?: boolean;
  /** Enable tap-to-react. Default true when animated. */
  interactive?: boolean;
  /** Enable navigator.vibrate haptic (web/Android). Default true. Pass onHaptic for native. */
  hapticsEnabled?: boolean;
  /** Called whenever a reaction fires — wire to native haptics in your app. */
  onHaptic?: (strength: HapticStrength) => void;
  /** Called whenever the user taps the pet (after the reaction starts). */
  onPetTap?: (pet: CompanionPet) => void;
  onTap?: () => void;
  onSwitch?: () => void;
}

const DEFAULT_NAMES: Record<CompanionPet, string> = {
  lamb: 'Eli, the lamb',
  dove: 'Noa, the dove',
  sparrow: 'Sparrow',
  flame: 'The Flame',
  lantern: 'The Lantern',
  lion: 'Judah, the lion',
  tiger: 'The Tiger',
  elephant: 'Asher, the elephant',
  burningBush: 'The Burning Bush',
};

const DEFAULT_LINES: Record<CompanionPet, string> = {
  lamb: 'Resting beside still waters.',
  dove: 'Peace, even in the noise.',
  sparrow: 'Held, even when small.',
  flame: 'Still burning. Still here.',
  lantern: 'A lamp for your steps.',
  lion: 'Be strong and courageous.',
  tiger: 'Quiet strength, fully present.',
  elephant: 'Gentle, slow, never alone.',
  burningBush: 'Holy ground, right where you stand.',
};

export function Companion({
  pet = 'lamb',
  name,
  line,
  state = 'with you',
  theme = 'light',
  scale = 1,
  animated = true,
  interactive,
  hapticsEnabled = true,
  onHaptic,
  onPetTap,
  onTap,
  onSwitch,
}: CompanionProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;
  const isInteractive = interactive ?? animated;
  const [reactionTick, setReactionTick] = useState(0);
  const [reaction, setReaction] = useState<Reaction | null>(null);

  const handlePetTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInteractive) return;
    const next = pickReaction(pet, reaction?.id ?? null);
    setReaction(next);
    setReactionTick((n) => n + 1);
    if (hapticsEnabled) fireHaptic(next.haptic);
    onHaptic?.(next.haptic);
    onPetTap?.(pet);
  };

  const displayName = name ?? DEFAULT_NAMES[pet];
  const displayLine = line ?? DEFAULT_LINES[pet];

  const stageBg =
    mode === 'dark'
      ? 'radial-gradient(ellipse at 50% 70%, rgba(196,149,106,0.18), transparent 70%)'
      : 'radial-gradient(ellipse at 50% 70%, rgba(196,149,106,0.18), transparent 70%)';

  return (
    <MediumWidgetFrame background={t.card} scale={scale} onTap={onTap} ariaLabel={`Companion: ${displayName}`}>
      {animated && <CompanionStyles />}

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
        {/* Left: pet stage */}
        <div
          onClick={handlePetTap}
          role={isInteractive ? 'button' : undefined}
          aria-label={isInteractive ? `Tap ${pet}` : undefined}
          style={{
            width: '44%',
            position: 'relative',
            borderRadius: `${14 * scale}px`,
            background: stageBg,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: `${10 * scale}px`,
            overflow: 'hidden',
            cursor: isInteractive ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          {/* Floating particles */}
          {animated && (
            <>
              <span
                className="sl-companion-particle"
                style={{
                  position: 'absolute',
                  left: '20%',
                  bottom: 0,
                  color: widgetTokens.amber,
                  fontSize: `${7 * scale}px`,
                  opacity: 0.5,
                  animationDelay: '0s',
                }}
              >
                ✦
              </span>
              <span
                className="sl-companion-particle"
                style={{
                  position: 'absolute',
                  left: '70%',
                  bottom: 0,
                  color: widgetTokens.amber,
                  fontSize: `${6 * scale}px`,
                  opacity: 0.4,
                  animationDelay: '2.4s',
                }}
              >
                ✦
              </span>
            </>
          )}

          <Pet
            pet={pet}
            scale={scale}
            animated={animated}
            mode={mode}
            reactionTick={reactionTick}
            reaction={reaction}
          />

          {/* Tap pulse ring */}
          {reactionTick > 0 && (
            <span
              key={`pulse-${reactionTick}`}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: `${10 * scale}px`,
                width: `${20 * scale}px`,
                height: `${20 * scale}px`,
                marginLeft: `${-10 * scale}px`,
                borderRadius: '50%',
                border: `1.5px solid ${widgetTokens.amber}`,
                pointerEvents: 'none',
                animation: 'sl-react-pulse-ring 0.6s ease-out',
              }}
            />
          )}

          {/* Emote bubble */}
          {reaction?.emote && (
            <span
              key={`emote-${reactionTick}`}
              style={{
                position: 'absolute',
                left: '64%',
                top: '14%',
                color: widgetTokens.amber,
                fontFamily: fonts.sans,
                fontSize: `${14 * scale}px`,
                fontWeight: 600,
                pointerEvents: 'none',
                animation: 'sl-react-emote 1.1s ease-out',
              }}
            >
              {reaction.emote}
            </span>
          )}

          {/* Subtle ground line */}
          <div
            style={{
              position: 'absolute',
              left: '15%',
              right: '15%',
              bottom: `${6 * scale}px`,
              height: '1px',
              backgroundColor: widgetTokens.amber,
              opacity: 0.18,
            }}
          />
        </div>

        {/* Right: identity */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingLeft: `${4 * scale}px`,
          }}
        >
          <div>
            <div
              style={{
                color: widgetTokens.amber,
                fontFamily: fonts.sans,
                fontSize: `${9 * scale}px`,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: `${4 * scale}px`,
              }}
            >
              Your companion
            </div>
            <div
              style={{
                color: t.text,
                fontFamily: fonts.serif,
                fontStyle: 'italic',
                fontSize: `${15 * scale}px`,
                lineHeight: 1.2,
                marginBottom: `${5 * scale}px`,
              }}
            >
              {displayName}
            </div>
            <p
              style={{
                color: t.muted,
                fontFamily: fonts.serif,
                fontStyle: 'italic',
                fontSize: `${11 * scale}px`,
                lineHeight: 1.32,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {displayLine}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                color: t.muted,
                fontFamily: fonts.sans,
                fontSize: `${9 * scale}px`,
                letterSpacing: '0.04em',
              }}
            >
              · {state}
            </span>
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                onSwitch?.();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: widgetTokens.amber,
                fontFamily: fonts.sans,
                fontSize: `${9 * scale}px`,
                fontWeight: 600,
                cursor: onSwitch ? 'pointer' : 'default',
                padding: 0,
              }}
            >
              ✦ Switch
            </button>
          </div>
        </div>
      </div>
    </MediumWidgetFrame>
  );
}

/* ---------- Pet renderer ---------- */
function Pet({
  pet,
  scale,
  animated,
  mode,
  reactionTick,
  reaction,
}: {
  pet: CompanionPet;
  scale: number;
  animated: boolean;
  mode: 'light' | 'dark';
  reactionTick: number;
  reaction: Reaction | null;
}) {
  const size = 70 * scale;
  const reactAnim =
    reactionTick > 0 && reaction ? `${reaction.anim} ${reaction.duration}ms ease-out` : undefined;

  const idleByPet: Record<CompanionPet, { anim: string; origin: string }> = {
    lamb:        { anim: 'sl-companion-idle 3s ease-in-out infinite',         origin: '50% 90%' },
    dove:        { anim: 'sl-companion-idle 3s ease-in-out infinite',         origin: '50% 90%' },
    sparrow:     { anim: 'sl-companion-hop 3s ease-in-out infinite',          origin: '50% 90%' },
    lion:        { anim: 'sl-companion-idle 3s ease-in-out infinite',         origin: '50% 90%' },
    tiger:       { anim: 'sl-companion-idle 3s ease-in-out infinite',         origin: '50% 90%' },
    elephant:    { anim: 'sl-companion-idle 3s ease-in-out infinite',         origin: '50% 90%' },
    flame:       { anim: 'sl-companion-flameidle 2.4s ease-in-out infinite',  origin: '50% 90%' },
    lantern:     { anim: 'sl-companion-sway 4s ease-in-out infinite',         origin: '50% 5%'  },
    burningBush: { anim: 'sl-companion-flameidle 2.4s ease-in-out infinite',  origin: '50% 90%' },
  };
  const { anim: idleAnim, origin } = idleByPet[pet];

  // Outer wrapper plays the one-shot reaction; inner wrapper plays the idle.
  // Splitting them prevents the infinite idle from overriding the reaction transform.
  const reactStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    transformOrigin: origin,
    animation: reactAnim,
    willChange: 'transform',
  };
  const idleStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    transformOrigin: origin,
    animation: animated ? idleAnim : undefined,
    willChange: 'transform',
  };

  const k = `pet-${pet}-${reactionTick}`;

  const inner = (() => {
    switch (pet) {
      case 'lamb':        return <Lamb mode={mode} animated={animated} />;
      case 'dove':        return <Dove mode={mode} animated={animated} />;
      case 'sparrow':     return <Sparrow mode={mode} animated={animated} />;
      case 'flame':       return <Flame animated={animated} mode={mode} />;
      case 'lantern':     return <Lantern animated={animated} mode={mode} />;
      case 'lion':        return <Lion mode={mode} animated={animated} />;
      case 'tiger':       return <Tiger mode={mode} animated={animated} />;
      case 'elephant':    return <Elephant mode={mode} animated={animated} />;
      case 'burningBush': return <BurningBush animated={animated} mode={mode} />;
    }
  })();

  return (
    <div key={k} style={reactStyle}>
      <div style={idleStyle}>{inner}</div>
    </div>
  );
}

/* ---------- Big-pet SVGs ---------- */
function Lion({ mode, animated }: { mode: 'light' | 'dark'; animated: boolean }) {
  const fur = '#C4956A';
  const mane = mode === 'dark' ? '#7A5C3F' : '#9C7C5A';
  const dark = '#3D2F2A';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Legs */}
      <rect x="34" y="68" width="5" height="14" rx="2" fill={fur} />
      <rect x="46" y="68" width="5" height="14" rx="2" fill={fur} />
      <rect x="60" y="68" width="5" height="14" rx="2" fill={fur} />
      <rect x="70" y="68" width="5" height="14" rx="2" fill={fur} />
      {/* Tail */}
      <path d="M 32 68 Q 22 64 22 76" stroke={fur} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="78" r="3" fill={mane} />
      {/* Body */}
      <ellipse cx="56" cy="62" rx="22" ry="13" fill={fur} />
      {/* Mane (back) */}
      <g
        style={{
          transformOrigin: '76px 50px',
          animation: animated ? 'sl-companion-breath 4s ease-in-out infinite' : undefined,
        }}
      >
        <circle cx="76" cy="50" r="16" fill={mane} />
        {/* tufts */}
        <circle cx="64" cy="42" r="4" fill={mane} />
        <circle cx="88" cy="44" r="4" fill={mane} />
        <circle cx="90" cy="56" r="4" fill={mane} />
        <circle cx="62" cy="56" r="4" fill={mane} />
        {/* Face */}
        <circle cx="76" cy="51" r="10" fill={fur} />
        {/* Eyes */}
        <circle cx="72" cy="49" r="1.3" fill={dark} />
        <circle cx="80" cy="49" r="1.3" fill={dark} />
        {/* Nose */}
        <path d="M 75 53 L 77 53 L 76 55 Z" fill={dark} />
        {/* Mouth */}
        <path d="M 76 55 Q 74 58 72 57" stroke={dark} strokeWidth="0.8" fill="none" />
        <path d="M 76 55 Q 78 58 80 57" stroke={dark} strokeWidth="0.8" fill="none" />
        {/* Ears */}
        <circle cx="68" cy="40" r="3" fill={mane} />
        <circle cx="84" cy="40" r="3" fill={mane} />
      </g>
    </svg>
  );
}

function Tiger({ mode, animated }: { mode: 'light' | 'dark'; animated: boolean }) {
  const fur = '#D89B5E';
  const belly = mode === 'dark' ? '#EDE8DF' : '#FAF8F5';
  const stripe = '#3D2F2A';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Tail */}
      <g
        style={{
          transformOrigin: '32px 64px',
          animation: animated ? 'sl-companion-tail 3.4s ease-in-out infinite' : undefined,
        }}
      >
        <path d="M 32 64 Q 18 60 14 72" stroke={fur} strokeWidth="4" fill="none" strokeLinecap="round" />
        <line x1="22" y1="62" x2="20" y2="58" stroke={stripe} strokeWidth="1.4" />
        <line x1="17" y1="65" x2="14" y2="63" stroke={stripe} strokeWidth="1.4" />
      </g>
      {/* Legs */}
      <rect x="34" y="66" width="5" height="16" rx="2" fill={fur} />
      <rect x="46" y="66" width="5" height="16" rx="2" fill={fur} />
      <rect x="60" y="66" width="5" height="16" rx="2" fill={fur} />
      <rect x="70" y="66" width="5" height="16" rx="2" fill={fur} />
      {/* Body */}
      <ellipse cx="56" cy="60" rx="22" ry="12" fill={fur} />
      {/* Belly */}
      <ellipse cx="56" cy="64" rx="14" ry="6" fill={belly} />
      {/* Body stripes */}
      <path d="M 44 50 Q 46 56 44 62" stroke={stripe} strokeWidth="1.6" fill="none" />
      <path d="M 54 49 Q 56 56 54 63" stroke={stripe} strokeWidth="1.6" fill="none" />
      <path d="M 64 50 Q 66 56 64 62" stroke={stripe} strokeWidth="1.6" fill="none" />
      {/* Head */}
      <g
        style={{
          transformOrigin: '78px 52px',
          animation: animated ? 'sl-companion-breath 4s ease-in-out infinite' : undefined,
        }}
      >
        <circle cx="78" cy="52" r="11" fill={fur} />
        {/* Cheek tufts */}
        <ellipse cx="72" cy="56" rx="3" ry="2" fill={belly} />
        <ellipse cx="84" cy="56" rx="3" ry="2" fill={belly} />
        {/* Stripes on head */}
        <path d="M 72 44 L 70 41" stroke={stripe} strokeWidth="1.4" />
        <path d="M 78 42 L 78 39" stroke={stripe} strokeWidth="1.4" />
        <path d="M 84 44 L 86 41" stroke={stripe} strokeWidth="1.4" />
        {/* Eyes */}
        <circle cx="74" cy="50" r="1.3" fill={stripe} />
        <circle cx="82" cy="50" r="1.3" fill={stripe} />
        {/* Nose */}
        <path d="M 77 54 L 79 54 L 78 56 Z" fill={stripe} />
        {/* Ears */}
        <path d="M 68 42 L 70 38 L 73 42 Z" fill={fur} />
        <path d="M 88 42 L 86 38 L 83 42 Z" fill={fur} />
      </g>
    </svg>
  );
}

function Elephant({ mode, animated }: { mode: 'light' | 'dark'; animated: boolean }) {
  const skin = mode === 'dark' ? '#A09080' : '#A09080';
  const shadow = mode === 'dark' ? '#7A6B5E' : '#8A7A6E';
  const dark = '#3D2F2A';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Legs */}
      <rect x="32" y="64" width="9" height="18" rx="3" fill={skin} />
      <rect x="46" y="64" width="9" height="18" rx="3" fill={skin} />
      <rect x="58" y="64" width="9" height="18" rx="3" fill={shadow} />
      <rect x="72" y="64" width="9" height="18" rx="3" fill={shadow} />
      {/* Toenails */}
      <rect x="33" y="80" width="2" height="2" fill={dark} opacity="0.4" />
      <rect x="38" y="80" width="2" height="2" fill={dark} opacity="0.4" />
      <rect x="47" y="80" width="2" height="2" fill={dark} opacity="0.4" />
      <rect x="52" y="80" width="2" height="2" fill={dark} opacity="0.4" />
      {/* Body */}
      <ellipse cx="56" cy="56" rx="26" ry="16" fill={skin} />
      {/* Head */}
      <circle cx="34" cy="50" r="14" fill={skin} />
      {/* Ear */}
      <g
        style={{
          transformOrigin: '36px 46px',
          animation: animated ? 'sl-companion-earflap 4.2s ease-in-out infinite' : undefined,
        }}
      >
        <ellipse cx="34" cy="46" rx="9" ry="11" fill={shadow} />
        <ellipse cx="34" cy="46" rx="6" ry="8" fill={skin} />
      </g>
      {/* Trunk */}
      <g
        style={{
          transformOrigin: '24px 54px',
          animation: animated ? 'sl-companion-trunk 5s ease-in-out infinite' : undefined,
        }}
      >
        <path
          d="M 24 54 Q 16 60 18 70 Q 20 76 26 74"
          stroke={skin}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      {/* Eye */}
      <circle cx="32" cy="48" r="1.4" fill={dark} />
      {/* Tusk */}
      <path d="M 22 56 Q 20 60 21 62" stroke="#FAF8F5" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Tail */}
      <path d="M 82 54 Q 88 56 86 64" stroke={skin} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="86" cy="64" r="1.5" fill={dark} opacity="0.5" />
    </svg>
  );
}

function BurningBush({ animated, mode }: { animated: boolean; mode: 'light' | 'dark' }) {
  const leaf = mode === 'dark' ? '#7A8E6A' : '#8FA67E';
  const leafDark = mode === 'dark' ? '#5A6E4A' : '#6F8A5E';
  const trunk = '#5A4632';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Glow */}
      <circle cx="50" cy="48" r="32" fill="#C4956A" opacity="0.18" />
      {/* Trunk */}
      <rect x="46" y="64" width="8" height="18" rx="2" fill={trunk} />
      <path d="M 50 82 L 36 88 M 50 82 L 64 88 M 50 82 L 50 90" stroke={trunk} strokeWidth="2" strokeLinecap="round" />
      {/* Leaves */}
      <circle cx="38" cy="58" r="11" fill={leafDark} />
      <circle cx="62" cy="58" r="11" fill={leafDark} />
      <circle cx="50" cy="48" r="14" fill={leaf} />
      <circle cx="40" cy="50" r="9" fill={leaf} />
      <circle cx="60" cy="50" r="9" fill={leaf} />
      <circle cx="50" cy="40" r="8" fill={leaf} />

      {/* Flames — multiple flickering layers */}
      <g
        style={{
          transformOrigin: '40px 50px',
          animation: animated ? 'sl-companion-flicker 1.4s ease-in-out infinite' : undefined,
        }}
      >
        <path d="M 40 50 Q 44 42 42 36 Q 40 32 38 36 Q 36 42 40 50 Z" fill="#E5A56A" />
      </g>
      <g
        style={{
          transformOrigin: '50px 42px',
          animation: animated ? 'sl-companion-flicker 1.7s ease-in-out infinite 0.3s' : undefined,
        }}
      >
        <path d="M 50 42 Q 56 30 52 22 Q 50 18 48 22 Q 44 30 50 42 Z" fill="#C4956A" />
        <path d="M 50 38 Q 53 30 51 26 Q 50 24 49 26 Q 47 30 50 38 Z" fill="#F3D29A" />
      </g>
      <g
        style={{
          transformOrigin: '60px 48px',
          animation: animated ? 'sl-companion-flicker 1.5s ease-in-out infinite 0.6s' : undefined,
        }}
      >
        <path d="M 60 48 Q 64 40 62 34 Q 60 30 58 34 Q 56 40 60 48 Z" fill="#E5A56A" />
      </g>
      {/* Embers */}
      <circle cx="36" cy="34" r="1.2" fill="#C4956A" opacity="0.7" />
      <circle cx="66" cy="36" r="1" fill="#C4956A" opacity="0.6" />
      <circle cx="50" cy="22" r="1.3" fill="#E5C39A" opacity="0.7" />
    </svg>
  );
}

/* ---------- Pet SVGs ---------- */
function Lamb({ mode, animated }: { mode: 'light' | 'dark'; animated: boolean }) {
  const wool = mode === 'dark' ? '#EDE8DF' : '#FAF8F5';
  const face = mode === 'dark' ? '#3D2F2A' : '#3D2F2A';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Legs */}
      <rect x="32" y="68" width="4" height="14" rx="2" fill={face} opacity="0.8" />
      <rect x="44" y="68" width="4" height="14" rx="2" fill={face} opacity="0.8" />
      <rect x="58" y="68" width="4" height="14" rx="2" fill={face} opacity="0.8" />
      <rect x="68" y="68" width="4" height="14" rx="2" fill={face} opacity="0.8" />
      {/* Body — three wool puffs */}
      <circle cx="40" cy="58" r="14" fill={wool} />
      <circle cx="55" cy="54" r="16" fill={wool} />
      <circle cx="68" cy="60" r="13" fill={wool} />
      {/* Head */}
      <ellipse cx="76" cy="50" rx="11" ry="9" fill={face} />
      {/* Ear */}
      <g
        style={{
          transformOrigin: '70px 44px',
          animation: animated ? 'sl-companion-ear 6s ease-in-out infinite' : undefined,
        }}
      >
        <ellipse cx="70" cy="44" rx="4" ry="6" fill={face} opacity="0.85" />
      </g>
      {/* Eye */}
      <circle cx="80" cy="49" r="1.4" fill={wool} />
      {/* Tuft */}
      <circle cx="74" cy="42" r="3" fill={wool} />
    </svg>
  );
}

function Dove({ mode, animated }: { mode: 'light' | 'dark'; animated: boolean }) {
  const body = mode === 'dark' ? '#EDE8DF' : '#FAF8F5';
  const accent = mode === 'dark' ? '#3D2F2A' : '#3D2F2A';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Body */}
      <ellipse cx="50" cy="58" rx="22" ry="14" fill={body} />
      {/* Tail */}
      <path d="M 28 60 L 14 56 L 16 64 Z" fill={body} />
      {/* Head */}
      <g
        style={{
          transformOrigin: '70px 48px',
          animation: animated ? 'sl-companion-headbob 3.2s ease-in-out infinite' : undefined,
        }}
      >
        <circle cx="70" cy="48" r="9" fill={body} />
        <path d="M 78 48 L 86 50 L 78 52 Z" fill="#C4956A" />
        <circle cx="73" cy="47" r="1.3" fill={accent} />
      </g>
      {/* Wing */}
      <g
        style={{
          transformOrigin: '50px 56px',
          animation: animated ? 'sl-companion-wing 3.6s ease-in-out infinite' : undefined,
        }}
      >
        <path
          d="M 40 56 Q 50 44 64 50 Q 56 60 42 62 Z"
          fill={body}
          stroke="#C4B59A"
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}

function Sparrow({ mode, animated }: { mode: 'light' | 'dark'; animated: boolean }) {
  const body = '#9C7C5A';
  const belly = mode === 'dark' ? '#C4B59A' : '#C4B59A';
  const accent = '#3D2F2A';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Body */}
      <ellipse cx="50" cy="60" rx="18" ry="14" fill={body} />
      {/* Belly */}
      <ellipse cx="48" cy="64" rx="11" ry="8" fill={belly} />
      {/* Head */}
      <g
        style={{
          transformOrigin: '64px 50px',
          animation: animated ? 'sl-companion-tilt 4.2s ease-in-out infinite' : undefined,
        }}
      >
        <circle cx="64" cy="50" r="9" fill={body} />
        <path d="M 72 50 L 78 51 L 72 53 Z" fill="#C4956A" />
        <circle cx="66" cy="48" r="1.3" fill={accent} />
      </g>
      {/* Wing */}
      <path d="M 42 56 Q 52 50 60 58 Q 50 64 42 62 Z" fill="#7A5C3F" />
      {/* Tail */}
      <path d="M 32 60 L 22 58 L 24 66 Z" fill={body} />
      {/* Legs */}
      <line x1="46" y1="74" x2="46" y2="80" stroke={accent} strokeWidth="1.2" />
      <line x1="54" y1="74" x2="54" y2="80" stroke={accent} strokeWidth="1.2" />
    </svg>
  );
}

function Flame({ animated, mode }: { animated: boolean; mode: 'light' | 'dark' }) {
  const wax = mode === 'dark' ? '#EDE8DF' : '#FAF8F5';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Candle base */}
      <rect x="42" y="56" width="16" height="26" rx="2" fill={wax} stroke="#C4B59A" strokeWidth="0.8" />
      {/* Wick */}
      <line x1="50" y1="56" x2="50" y2="50" stroke="#3D2F2A" strokeWidth="1.2" />
      {/* Flame */}
      <g
        style={{
          transformOrigin: '50px 50px',
          animation: animated ? 'sl-companion-flicker 1.6s ease-in-out infinite' : undefined,
        }}
      >
        <path
          d="M 50 18 Q 60 32 58 42 Q 56 52 50 52 Q 44 52 42 42 Q 40 32 50 18 Z"
          fill="#C4956A"
        />
        <path
          d="M 50 28 Q 55 36 54 42 Q 52 48 50 48 Q 48 48 46 42 Q 45 36 50 28 Z"
          fill="#E5C39A"
        />
      </g>
      {/* Glow */}
      <circle cx="50" cy="36" r="22" fill="#C4956A" opacity="0.12" />
    </svg>
  );
}

function Lantern({ animated, mode }: { animated: boolean; mode: 'light' | 'dark' }) {
  const metal = mode === 'dark' ? '#5A4632' : '#5A4632';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Hanger */}
      <path d="M 50 6 Q 50 14 50 16" stroke={metal} strokeWidth="1.5" fill="none" />
      <circle cx="50" cy="4" r="3" fill="none" stroke={metal} strokeWidth="1.5" />
      {/* Top cap */}
      <path d="M 36 16 L 64 16 L 60 22 L 40 22 Z" fill={metal} />
      {/* Glass body */}
      <path
        d="M 38 22 L 62 22 L 64 60 L 36 60 Z"
        fill="#FAF0DC"
        stroke={metal}
        strokeWidth="1.4"
        opacity="0.95"
      />
      {/* Inner flame */}
      <g
        style={{
          transformOrigin: '50px 50px',
          animation: animated ? 'sl-companion-flicker 1.8s ease-in-out infinite' : undefined,
        }}
      >
        <path
          d="M 50 32 Q 56 42 55 50 Q 53 56 50 56 Q 47 56 45 50 Q 44 42 50 32 Z"
          fill="#C4956A"
        />
      </g>
      {/* Base */}
      <rect x="34" y="60" width="32" height="6" rx="1" fill={metal} />
      {/* Glow */}
      <circle cx="50" cy="48" r="18" fill="#C4956A" opacity="0.18" />
    </svg>
  );
}

/* ---------- Animations ---------- */
function CompanionStyles() {
  return (
    <style>{`
      @keyframes sl-companion-idle {
        0%, 100% { transform: translateY(0) scale(1, 1); }
        25%      { transform: translateY(-3px) scale(1.05, 0.95); }
        50%      { transform: translateY(-6px) scale(1.08, 0.92); }
        75%      { transform: translateY(-3px) scale(1.05, 0.95); }
      }
      @keyframes sl-companion-flameidle {
        0%, 100% { transform: scale(1, 1) skewX(0deg); }
        25% { transform: scale(0.94, 1.08) skewX(-3deg); }
        50% { transform: scale(1.05, 0.95) skewX(2deg); }
        75% { transform: scale(0.96, 1.06) skewX(3deg); }
      }
      @keyframes sl-companion-breath {
        0%, 100% { transform: scale(1, 1); }
        50% { transform: scale(1.015, 1.025); }
      }
      @keyframes sl-companion-ear {
        0%, 88%, 100% { transform: rotate(0deg); }
        92% { transform: rotate(-12deg); }
        96% { transform: rotate(4deg); }
      }
      @keyframes sl-companion-headbob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-1.5px); }
      }
      @keyframes sl-companion-wing {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-6deg); }
      }
      @keyframes sl-companion-hop {
        0%, 50%, 100% { transform: translateY(0); }
        60% { transform: translateY(-8px); }
        72% { transform: translateY(0); }
        82% { transform: translateY(-3px); }
        92% { transform: translateY(0); }
      }
      @keyframes sl-companion-tilt {
        0%, 100% { transform: rotate(0deg); }
        45% { transform: rotate(-8deg); }
        55% { transform: rotate(-8deg); }
      }
      @keyframes sl-companion-flicker {
        0%, 100% { transform: scale(1, 1) skewX(0deg); opacity: 1; }
        25% { transform: scale(0.96, 1.04) skewX(-2deg); opacity: 0.92; }
        50% { transform: scale(1.02, 0.98) skewX(1deg); opacity: 1; }
        75% { transform: scale(0.98, 1.02) skewX(2deg); opacity: 0.95; }
      }
      @keyframes sl-companion-sway {
        0%, 100% { transform: rotate(-4deg); }
        50% { transform: rotate(4deg); }
      }
      @keyframes sl-companion-tail {
        0%, 100% { transform: rotate(-4deg); }
        50% { transform: rotate(8deg); }
      }
      @keyframes sl-companion-earflap {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-10deg); }
      }
      @keyframes sl-companion-trunk {
        0%, 100% { transform: rotate(0deg); }
        40% { transform: rotate(-6deg); }
        70% { transform: rotate(4deg); }
      }
      @keyframes sl-companion-particle {
        0% { transform: translateY(0) scale(1); opacity: 0; }
        20% { opacity: 0.6; }
        100% { transform: translateY(-60px) scale(0.6); opacity: 0; }
      }
      .sl-companion-particle {
        animation: sl-companion-particle 6s ease-out infinite;
      }

      /* ---------- Per-pet signature reactions ---------- */
      @keyframes sl-mv-lamb-walk-l {
        0%   { transform: translateX(0)    translateY(0); }
        15%  { transform: translateX(-4px) translateY(-2px); }
        30%  { transform: translateX(-8px) translateY(0); }
        45%  { transform: translateX(-12px) translateY(-2px); }
        60%  { transform: translateX(-14px) translateY(0); }
        75%  { transform: translateX(-10px) translateY(-1px); }
        90%  { transform: translateX(-4px) translateY(0); }
        100% { transform: translateX(0)    translateY(0); }
      }
      @keyframes sl-mv-lamb-walk-r {
        0%   { transform: translateX(0)   translateY(0); }
        15%  { transform: translateX(4px) translateY(-2px); }
        30%  { transform: translateX(8px) translateY(0); }
        45%  { transform: translateX(12px) translateY(-2px); }
        60%  { transform: translateX(14px) translateY(0); }
        75%  { transform: translateX(10px) translateY(-1px); }
        90%  { transform: translateX(4px) translateY(0); }
        100% { transform: translateX(0)   translateY(0); }
      }
      @keyframes sl-mv-lamb-hop {
        0%   { transform: translateY(0)    scale(1, 1); }
        20%  { transform: translateY(0)    scale(1.08, 0.88); }
        45%  { transform: translateY(-22px) scale(0.96, 1.06); }
        70%  { transform: translateY(0)    scale(1.06, 0.92); }
        85%  { transform: translateY(-6px) scale(1.01, 0.99); }
        100% { transform: translateY(0)    scale(1, 1); }
      }

      /* ---------- Movement vocabulary (calming, expressive, connective) ---------- */
      @keyframes sl-mv-bow {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        45%      { transform: translateY(2px) rotate(-8deg); }
        70%      { transform: translateY(1px) rotate(-5deg); }
      }
      @keyframes sl-mv-nod {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        40%      { transform: translateY(1px) rotate(6deg); }
        70%      { transform: translateY(0)   rotate(-2deg); }
      }
      @keyframes sl-mv-nod-deep {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        35%      { transform: translateY(2px) rotate(10deg); }
        70%      { transform: translateY(0)   rotate(-3deg); }
      }
      @keyframes sl-mv-hop-soft {
        0%, 100% { transform: translateY(0) scale(1, 1); }
        35%      { transform: translateY(-9px) scale(1.02, 0.96); }
        65%      { transform: translateY(0)    scale(0.98, 1.02); }
      }
      @keyframes sl-mv-hop-double {
        0%, 100% { transform: translateY(0); }
        20%      { transform: translateY(-7px); }
        40%      { transform: translateY(0); }
        65%      { transform: translateY(-9px); }
        85%      { transform: translateY(0); }
      }
      @keyframes sl-mv-hop-prance {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        25%      { transform: translateY(-8px) rotate(-4deg); }
        55%      { transform: translateY(-3px) rotate(3deg); }
        80%      { transform: translateY(-1px) rotate(-1deg); }
      }
      @keyframes sl-mv-sway-gentle {
        0%, 100% { transform: translateX(0) rotate(0deg); }
        30%      { transform: translateX(-4px) rotate(-3deg); }
        70%      { transform: translateX(4px)  rotate(3deg); }
      }
      @keyframes sl-mv-sway-wide {
        0%, 100% { transform: translateX(0) rotate(0deg); }
        30%      { transform: translateX(-7px) rotate(-5deg); }
        70%      { transform: translateX(7px)  rotate(5deg); }
      }
      @keyframes sl-mv-tilt-curious {
        0%, 100% { transform: rotate(0deg); }
        45%      { transform: rotate(-9deg); }
        65%      { transform: rotate(-9deg); }
      }
      @keyframes sl-mv-tilt-shake {
        0%, 100% { transform: rotate(0deg); }
        20%      { transform: rotate(-6deg); }
        40%      { transform: rotate(6deg); }
        60%      { transform: rotate(-4deg); }
        80%      { transform: rotate(3deg); }
      }
      @keyframes sl-mv-look-around {
        0%, 100% { transform: rotate(0deg) translateX(0); }
        25%      { transform: rotate(-7deg) translateX(-2px); }
        55%      { transform: rotate(7deg)  translateX(2px); }
        80%      { transform: rotate(-2deg) translateX(0); }
      }
      @keyframes sl-mv-look-up {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50%      { transform: translateY(-3px) rotate(-4deg); }
      }
      @keyframes sl-mv-flit-right {
        0%   { transform: translateX(0) translateY(0); }
        40%  { transform: translateX(7px) translateY(-4px); }
        70%  { transform: translateX(7px) translateY(0); }
        100% { transform: translateX(0) translateY(0); }
      }
      @keyframes sl-mv-flit-left {
        0%   { transform: translateX(0) translateY(0); }
        40%  { transform: translateX(-7px) translateY(-4px); }
        70%  { transform: translateX(-7px) translateY(0); }
        100% { transform: translateX(0) translateY(0); }
      }
      @keyframes sl-mv-skitter {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-3px); }
        40% { transform: translateX(3px); }
        60% { transform: translateX(-2px); }
        80% { transform: translateX(2px); }
      }
      @keyframes sl-mv-grow-warm {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        50%      { transform: scale(1.06); filter: brightness(1.08); }
      }
      @keyframes sl-mv-coo {
        0%, 100% { transform: translateY(0) scale(1, 1); }
        35%      { transform: translateY(-1px) scale(1.04, 0.98); }
        70%      { transform: translateY(0)    scale(0.99, 1.02); }
      }
      @keyframes sl-mv-flutter {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        25%      { transform: translateY(-3px) rotate(-2deg); }
        50%      { transform: translateY(-5px) rotate(2deg); }
        75%      { transform: translateY(-3px) rotate(-1deg); }
      }
      @keyframes sl-mv-lift {
        0%, 100% { transform: translateY(0) scale(1); }
        50%      { transform: translateY(-10px) scale(1.03); }
      }
      @keyframes sl-mv-twirl {
        0%   { transform: rotate(0deg) scale(1); }
        50%  { transform: rotate(180deg) scale(1.04); }
        100% { transform: rotate(360deg) scale(1); }
      }
      @keyframes sl-mv-settle {
        0%   { transform: translateY(0) scale(1, 1); }
        40%  { transform: translateY(2px) scale(1.04, 0.96); }
        100% { transform: translateY(0) scale(1, 1); }
      }
      @keyframes sl-mv-rise-tall {
        0%, 100% { transform: translateY(0) scale(1, 1); }
        50%      { transform: translateY(-5px) scale(0.98, 1.06); }
      }
      @keyframes sl-mv-tail-swish {
        0%, 100% { transform: rotate(0deg); }
        30%      { transform: rotate(-3deg); }
        70%      { transform: rotate(3deg); }
      }
      @keyframes sl-mv-roar {
        0%, 100% { transform: scale(1, 1); }
        25%      { transform: scale(1.06, 1.02); }
        55%      { transform: scale(1.10, 1.04); }
        80%      { transform: scale(1.02, 1.01); }
      }
      @keyframes sl-mv-stretch-fwd {
        0%, 100% { transform: translateX(0) scale(1, 1); }
        50%      { transform: translateX(4px) scale(1.05, 0.96); }
      }
      @keyframes sl-mv-trumpet {
        0%, 100% { transform: translateY(0) scale(1, 1); }
        30%      { transform: translateY(-4px) scale(1.04, 1.02); }
        60%      { transform: translateY(-2px) scale(1.06, 1.03); }
      }
      @keyframes sl-mv-dust-shake {
        0%, 100% { transform: translateX(0) rotate(0deg); }
        15% { transform: translateX(-3px) rotate(-3deg); }
        30% { transform: translateX(3px)  rotate(3deg); }
        45% { transform: translateX(-3px) rotate(-2deg); }
        60% { transform: translateX(3px)  rotate(2deg); }
        80% { transform: translateX(-1px) rotate(-1deg); }
      }
      /* Flame reactions */
      @keyframes sl-react-flarepulse {
        0%   { transform: scale(1); filter: brightness(1); }
        40%  { transform: scale(1.22); filter: brightness(1.5); }
        100% { transform: scale(1); filter: brightness(1); }
      }
      @keyframes sl-react-flareswell {
        0%   { transform: scaleY(1) scaleX(1); filter: brightness(1); }
        50%  { transform: scaleY(1.3) scaleX(0.9); filter: brightness(1.35); }
        100% { transform: scaleY(1) scaleX(1); filter: brightness(1); }
      }
      @keyframes sl-react-flaresnap {
        0%   { transform: scale(1) skewX(0deg); filter: brightness(1); }
        25%  { transform: scale(0.85, 1.25) skewX(-6deg); filter: brightness(1.6); }
        55%  { transform: scale(1.1, 0.9) skewX(4deg); filter: brightness(1.2); }
        100% { transform: scale(1) skewX(0deg); filter: brightness(1); }
      }
      /* Lantern reactions */
      @keyframes sl-react-lanternswing {
        0%   { transform: rotate(0deg); }
        20%  { transform: rotate(-14deg); }
        45%  { transform: rotate(11deg); }
        65%  { transform: rotate(-7deg); }
        85%  { transform: rotate(4deg); }
        100% { transform: rotate(0deg); }
      }
      @keyframes sl-react-lanternbob {
        0%   { transform: translateY(0) rotate(0deg); }
        40%  { transform: translateY(-4px) rotate(-5deg); }
        70%  { transform: translateY(0) rotate(3deg); }
        100% { transform: translateY(0) rotate(0deg); }
      }
      @keyframes sl-react-lanternglow {
        0%   { transform: rotate(0deg); filter: brightness(1); }
        30%  { transform: rotate(-3deg); filter: brightness(1.3); }
        60%  { transform: rotate(2deg); filter: brightness(1.15); }
        100% { transform: rotate(0deg); filter: brightness(1); }
      }
      /* Burning bush reactions */
      @keyframes sl-react-bushburst {
        0%   { transform: scale(1); filter: brightness(1); }
        30%  { transform: scale(1.14); filter: brightness(1.45); }
        60%  { transform: scale(0.97); filter: brightness(1.1); }
        100% { transform: scale(1); filter: brightness(1); }
      }
      @keyframes sl-react-bushshimmer {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        20% { transform: scale(1.04); filter: brightness(1.2); }
        45% { transform: scale(0.98); filter: brightness(1.1); }
        70% { transform: scale(1.03); filter: brightness(1.25); }
      }
      @keyframes sl-react-bushkindle {
        0%   { transform: scaleY(1); filter: brightness(1); }
        50%  { transform: scaleY(1.1); filter: brightness(1.35); }
        100% { transform: scaleY(1); filter: brightness(1); }
      }
      @keyframes sl-react-pulse-ring {
        0% { transform: scale(0.4); opacity: 0.7; }
        100% { transform: scale(2.4); opacity: 0; }
      }
      @keyframes sl-react-emote {
        0%   { transform: translateY(0) scale(0.4); opacity: 0; }
        25%  { transform: translateY(-10px) scale(1.1); opacity: 1; }
        70%  { transform: translateY(-18px) scale(1); opacity: 1; }
        100% { transform: translateY(-28px) scale(0.9); opacity: 0; }
      }
    `}</style>
  );
}
