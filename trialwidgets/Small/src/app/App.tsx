import {
  CarriedVerse,
  DoorOpen,
  LineThatStayed,
  SoftOpen,
  SpeakFreely,
} from './components/widgets';

const widgets = [
  { letter: 'A', name: 'Soft Open', render: (theme: 'light' | 'dark') => <SoftOpen name="Anna" theme={theme} scale={2} /> },
  { letter: 'B', name: 'Carried Verse', render: (theme: 'light' | 'dark') => <CarriedVerse theme={theme} scale={2} /> },
  { letter: 'C', name: 'The Door Is Still Open', render: (theme: 'light' | 'dark') => <DoorOpen theme={theme} scale={2} /> },
  { letter: 'D', name: 'Speak Freely', render: (theme: 'light' | 'dark') => <SpeakFreely theme={theme} scale={2} /> },
  { letter: 'E', name: 'The Line That Stayed', render: (theme: 'light' | 'dark') => <LineThatStayed theme={theme} scale={2} /> },
];

export default function App() {
  return (
    <div className="min-h-screen p-10" style={{ backgroundColor: '#0F0E0C' }}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1
            className="text-white"
            style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: '"DM Sans", sans-serif' }}
          >
            Soft Landing — Widget Library
          </h1>
          <p style={{ color: '#A09080', fontSize: '14px', marginTop: '6px', fontFamily: '"DM Sans", sans-serif' }}>
            Showcase of <code>src/app/components/widgets/</code> · drop the folder into your app and import.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-14">
          {widgets.map((w) => (
            <div key={w.letter}>
              <div className="flex items-baseline gap-2 mb-4">
                <span style={{ color: '#C4956A', fontFamily: '"DM Sans", sans-serif', fontSize: '12px', fontWeight: 700 }}>
                  {w.letter}
                </span>
                <span style={{ color: '#EDE8DF', fontFamily: '"DM Sans", sans-serif', fontSize: '12px', fontWeight: 600 }}>
                  {w.name}
                </span>
              </div>
              <div className="flex gap-5">
                <Labeled caption="Light">{w.render('light')}</Labeled>
                <Labeled caption="Dark">{w.render('dark')}</Labeled>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-16 p-5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <h2 style={{ color: '#EDE8DF', fontFamily: '"DM Sans", sans-serif', fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>
            How to use in your app
          </h2>
          <pre
            style={{
              color: '#EDE8DF',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: '12px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              margin: 0,
            }}
          >
{`// 1. Copy src/app/components/widgets/ into your app
// 2. Add fonts to your global CSS:
//    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400..700&family=Lora:ital,wght@0,400..700;1,400..700&display=swap');
// 3. Import and use:

import { SoftOpen, CarriedVerse } from './components/widgets';

<SoftOpen name="Anna" theme="auto" onEmotionSelect={(e) => /* route to check-in */} />
<CarriedVerse reference="Psalm 34:18" text="..." emotion="sad" onTap={...} />`}
          </pre>
        </section>
      </div>
    </div>
  );
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
