import { useState } from 'react';
import {
  ClockLandscape,
  Companion,
  CompanionPet,
  EmotionMosaic,
  FromGod,
  FullVerse,
} from './components/widgets';

const SCALE = 1.5;
const PETS: CompanionPet[] = [
  'lamb',
  'dove',
  'sparrow',
  'flame',
  'lantern',
  'lion',
  'tiger',
  'elephant',
  'burningBush',
];
const PET_LABELS: Record<CompanionPet, string> = {
  lamb: 'Lamb',
  dove: 'Dove',
  sparrow: 'Sparrow',
  flame: 'Flame',
  lantern: 'Lantern',
  lion: 'Lion',
  tiger: 'Tiger',
  elephant: 'Elephant',
  burningBush: 'Burning Bush',
};

export default function App() {
  const [pet, setPet] = useState<CompanionPet>('lamb');

  return (
    <div className="min-h-screen p-10" style={{ backgroundColor: '#0F0E0C' }}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1
            style={{
              color: '#EDE8DF',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            Soft Landing — Medium Widgets
          </h1>
          <p style={{ color: '#A09080', fontSize: '14px', marginTop: '6px', fontFamily: '"DM Sans", sans-serif' }}>
            Featured: Animated Companion · plus G, I, J
          </p>
        </header>

        {/* Companion — featured with picker */}
        <section className="mb-12">
          <div className="flex items-baseline gap-2 mb-2">
            <span style={{ color: '#C4956A', fontFamily: '"DM Sans", sans-serif', fontSize: '13px', fontWeight: 700 }}>
              ★
            </span>
            <span style={{ color: '#EDE8DF', fontFamily: '"DM Sans", sans-serif', fontSize: '13px', fontWeight: 600 }}>
              Companion (animated)
            </span>
          </div>
          <p style={{ color: '#A09080', fontSize: '12px', fontFamily: '"DM Sans", sans-serif', marginBottom: '14px' }}>
            Tap the animal — 10 random reactions (jump, spin, wiggle, smile ♡, peek ?…). Inanimate objects (flame, lantern, burning bush) only do their thematic motions (flicker, sway, burst). Idle animation runs continuously.
          </p>

          {/* Pet picker */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {PETS.map((p) => (
              <button
                key={p}
                onClick={() => setPet(p)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  border: pet === p ? '1px solid #C4956A' : '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: pet === p ? 'rgba(196,149,106,0.15)' : 'transparent',
                  color: pet === p ? '#EDE8DF' : '#A09080',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {PET_LABELS[p]}
              </button>
            ))}
          </div>

          <div className="flex gap-6 flex-wrap">
            <Labeled caption="Light · animated">
              <Companion pet={pet} theme="light" scale={SCALE} animated onSwitch={() => setPet(nextPet(pet))} />
            </Labeled>
            <Labeled caption="Dark · animated">
              <Companion pet={pet} theme="dark" scale={SCALE} animated onSwitch={() => setPet(nextPet(pet))} />
            </Labeled>
          </div>

          <div className="mt-6 flex gap-6 flex-wrap">
            <Labeled caption="Static frame · iOS home screen">
              <Companion pet={pet} theme="light" scale={SCALE} animated={false} state="resting" />
            </Labeled>
          </div>
        </section>

        <Divider />

        {/* G, I, J */}
        <Stack
          rows={[
            { letter: 'G', name: 'Full Verse', render: (theme) => <FullVerse theme={theme} scale={SCALE} /> },
            { letter: 'I', name: 'Emotion Mosaic', render: (theme) => <EmotionMosaic theme={theme} scale={SCALE} /> },
            { letter: 'J', name: 'From God (tap for a new message)', render: (theme) => <FromGod theme={theme} scale={SCALE} /> },
            { letter: 'K', name: 'Clock & Landscape (tap to cycle 10 scenes)', render: (theme) => <ClockLandscape theme={theme} scale={SCALE} /> },
          ]}
        />
      </div>
    </div>
  );
}

function nextPet(p: CompanionPet): CompanionPet {
  const i = PETS.indexOf(p);
  return PETS[(i + 1) % PETS.length];
}

function Stack({
  rows,
}: {
  rows: { letter: string; name: string; render: (theme: 'light' | 'dark') => React.ReactNode }[];
}) {
  return (
    <div className="flex flex-col">
      {rows.map((w, i) => (
        <div key={w.letter}>
          <div className="py-8">
            <div className="flex items-baseline gap-2 mb-5">
              <span style={{ color: '#C4956A', fontFamily: '"DM Sans", sans-serif', fontSize: '13px', fontWeight: 700 }}>
                {w.letter}
              </span>
              <span style={{ color: '#EDE8DF', fontFamily: '"DM Sans", sans-serif', fontSize: '13px', fontWeight: 600 }}>
                {w.name}
              </span>
            </div>
            <div className="flex gap-6 flex-wrap">
              <Labeled caption="Light">{w.render('light')}</Labeled>
              <Labeled caption="Dark">{w.render('dark')}</Labeled>
            </div>
          </div>
          {i < rows.length - 1 && <Divider />}
        </div>
      ))}
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', backgroundColor: '#E0D8CC', opacity: 0.18 }} />;
}

function Labeled({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      <div
        style={{
          marginTop: '8px',
          color: '#A09080',
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {caption}
      </div>
    </div>
  );
}
