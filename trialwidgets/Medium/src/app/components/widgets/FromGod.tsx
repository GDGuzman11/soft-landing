import { useEffect, useState } from 'react';
import { MediumWidgetFrame } from './MediumWidgetFrame';
import { BASE_INSET, WidgetTheme, fonts, resolveTheme, widgetTokens } from './tokens';

interface GodMessage {
  text: string;
  reference: string;
}

/**
 * A pool of short messages "from God" — written like texts from a best friend
 * who's seen everything, keeps it real, sometimes references the people in his
 * book the way you'd reference a mutual friend's story. Each message is paired
 * with the verse it draws from so the reader can connect the casual line to
 * its source.
 */
const MESSAGES: GodMessage[] = [
  // Real / steady
  { text: "You don't have to perform today. Just show up — I'll meet you where you are.", reference: 'Matthew 11:28' },
  { text: "I'm not grading the prayer. I'm just glad you sent it.",                        reference: 'Romans 8:26' },
  { text: "Yes, I heard you at 3am. I always do.",                                         reference: 'Psalm 139:1–4' },
  { text: "Tired isn't a moral failure. Rest is allowed — I literally took a day off.",   reference: 'Genesis 2:2' },
  { text: "Whatever you're carrying, you don't have to carry it alone today.",            reference: '1 Peter 5:7' },
  { text: "I'd rather have you honest than impressive.",                                  reference: 'Psalm 51:6' },
  { text: 'Hard day. Still loved. Both true.',                                            reference: 'Romans 8:38–39' },
  { text: "You're not behind. You're not too late. We're still here.",                    reference: 'Lamentations 3:22–23' },
  { text: "It doesn't have to be a good day for it to be a sacred one.",                  reference: 'Psalm 118:24' },
  { text: 'You can stop apologizing for taking up space.',                                 reference: 'Psalm 139:14' },

  // Humor that lands soft
  { text: 'Yes, the mumbled one in traffic counts. I caught it.',                         reference: 'Romans 8:26' },
  { text: "I built oceans. Your problem isn't too big — tell me about it.",               reference: 'Jeremiah 32:17' },
  { text: "You don't need to tidy up before coming over.",                                reference: 'Romans 5:8' },
  { text: "I'm not keeping score. That was never the deal.",                              reference: 'Psalm 103:10' },
  { text: "The fact that you're still here is already a small miracle. We can build on that.", reference: 'Psalm 30:5' },

  // Bible-character cameos, used like a friend's story
  { text: "Remember Moses had a stutter and still led a nation. Your voice isn't disqualifying.", reference: 'Exodus 4:10–12' },
  { text: 'David wrote half the Psalms when everything was on fire. You can be that honest with me.', reference: 'Psalm 13:1–2' },
  { text: 'Peter sank the second he looked at the waves. Eyes on me — not the chaos.',   reference: 'Matthew 14:30' },
  { text: 'Jonah ran. I still used him. Coming back is always on the table.',            reference: 'Jonah 3:1' },
  { text: "Elijah was done under that tree and I sent him bread, not a sermon. I'll do the same.", reference: '1 Kings 19:4–7' },
  { text: "Joseph spent years in a pit before the palace. Your wait isn't wasted.",      reference: 'Genesis 50:20' },
  { text: "Ruth started over in a country she didn't know. You're allowed to start over too.", reference: 'Ruth 1:16' },
  { text: "Thomas needed to touch the wounds. Bring your doubts — I don't flinch.",      reference: 'John 20:27' },
  { text: "Esther was terrified before she walked in there. Brave doesn't mean unafraid.", reference: 'Esther 4:16' },
  { text: "Job's friends meant well and got it mostly wrong. You don't owe anyone a tidy story.", reference: 'Job 42:7' },
  { text: "Mary said yes before she had any answers. You don't need the whole map.",     reference: 'Luke 1:38' },
  { text: "Hagar was alone in the desert when I found her. I see the ones nobody's looking for.", reference: 'Genesis 16:13' },
  { text: 'Gideon was hiding in a wine press when I called him a warrior. I see who you actually are.', reference: 'Judges 6:12' },
  { text: "Even my Son asked his friends to stay awake with him. Asking for company isn't weakness.", reference: 'Matthew 26:38' },
  { text: 'Paul spent 14 years re-learning everything. Slow growth is still growth.',    reference: 'Galatians 1:17–18' },
  { text: "Naomi came home empty and bitter. I didn't rush her. I won't rush you either.", reference: 'Ruth 1:20–21' },
  { text: 'Zacchaeus climbed a tree just to see me. The desire to be near me — that\'s already enough.', reference: 'Luke 19:5' },

  // Steady motivation, not cheesy
  { text: "One small thing today. That's all. The rest will keep.",                      reference: 'Matthew 6:34' },
  { text: "You've survived 100% of your worst days. Keep that on the resume.",           reference: '2 Corinthians 4:8–9' },
  { text: "Grace isn't a finish line. It's the floor.",                                  reference: 'Ephesians 2:8' },
  { text: "Progress doesn't always feel like progress. Trust the slow yes.",             reference: 'Philippians 1:6' },
  { text: 'You can change your mind. I do not love you less for the pivot.',             reference: 'Joel 2:13' },
  { text: "The shame doesn't get the last word. Not on my watch.",                       reference: 'Romans 8:1' },
  { text: "I'd rather you come close angry than stay away polite.",                      reference: 'Psalm 62:8' },
  { text: "Try the small brave thing. I'll handle the rest.",                            reference: 'Joshua 1:9' },

  // Humor + heart — relatable, current cadence, no cringe
  { text: 'Spiraling at 11pm again? Same time, same place — I\'m here. Bring snacks.',   reference: 'Psalm 121:3–4' },
  { text: 'Stop reading the group chat about you that only exists in your head.',         reference: 'Proverbs 4:23' },
  { text: "You're not 'too much.' Whoever told you that has bad taste.",                  reference: 'Psalm 139:14' },
  { text: "The to-do list isn't your worth. Burn the list. Keep the worth.",              reference: 'Luke 10:41–42' },
  { text: "Your timeline isn't late. It's yours. There's no leaderboard up here.",        reference: 'Ecclesiastes 3:1' },
  { text: 'Cried in the car? Sacred ground. I was in the passenger seat.',                reference: 'Psalm 56:8' },
  { text: "Your overthinking can take a day off. I've got the meeting covered.",          reference: 'Matthew 6:27' },
  { text: "You don't have to soft-launch this with me. Hard launch the whole mess.",      reference: '1 John 1:9' },
  { text: "Read receipts are on. I see you. I'm not ghosting — promise.",                 reference: 'Psalm 34:15' },
  { text: "Plot twist: you're not the villain in your story. Stop auditioning for it.",   reference: 'Romans 8:1' },
  { text: "You're allowed to log off — even from the parts of yourself you don't like today.", reference: 'Psalm 23:2' },
  { text: "If 'fine' was a costume, you'd win Halloween. Take it off — it's just us.",    reference: 'Psalm 62:8' },
  { text: "Yes, 'help' counts as a prayer. So does 'please.' So does the sigh.",          reference: 'Romans 8:26' },
  { text: "I'm not a vending machine. I'm something better. Stay with me.",               reference: 'Matthew 7:9–11' },
  { text: "Comparing yourself to people online is like racing a Photoshop. You'll lose every time.", reference: 'Galatians 6:4' },
  { text: "Your feed is curated. Your life isn't supposed to be. That's not a flaw — that's real.", reference: 'John 16:33' },
  { text: "If your inner voice talked to a friend like that, you'd block it. So block it.", reference: 'Philippians 4:8' },
  { text: 'The bar is on the floor today. Step over it. That counts.',                    reference: 'Zechariah 4:10' },
  { text: 'You can be a mess and still be mine. Both/and. Always was both/and.',          reference: 'Romans 5:8' },
  { text: "Touch grass, drink water, talk to me. In any order. We'll figure it out.",     reference: 'Psalm 23:2–3' },
];

function pickIndex(prev: number): number {
  if (MESSAGES.length <= 1) return 0;
  let i = Math.floor(Math.random() * MESSAGES.length);
  if (i === prev) i = (i + 1) % MESSAGES.length;
  return i;
}

export type MessagePlatform = 'ios' | 'android' | 'auto';

function detectPlatform(): 'ios' | 'android' {
  if (typeof navigator === 'undefined') return 'ios';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  return 'ios';
}

export interface FromGodProps {
  /** Override the message text; if omitted, picks at random and advances on tap. */
  message?: string;
  /** Override the verse reference paired with the message. */
  reference?: string;
  timestamp?: string;
  /** Platform skin: iOS Messages or Android Material. Default 'auto' (detect from UA). */
  platform?: MessagePlatform;
  theme?: WidgetTheme;
  scale?: number;
  /** When uncontrolled, taps cycle through messages. Default true. */
  cycleOnTap?: boolean;
  onTap?: () => void;
  onMessageChange?: (message: GodMessage) => void;
}

export function FromGod({
  message,
  reference,
  timestamp = 'now',
  platform = 'auto',
  theme = 'light',
  scale = 1,
  cycleOnTap = true,
  onTap,
  onMessageChange,
}: FromGodProps) {
  const mode = resolveTheme(theme);
  const t = widgetTokens[mode];
  const inset = BASE_INSET * scale;

  const [resolvedPlatform, setResolvedPlatform] = useState<'ios' | 'android'>(
    platform === 'auto' ? 'ios' : platform,
  );
  useEffect(() => {
    setResolvedPlatform(platform === 'auto' ? detectPlatform() : platform);
  }, [platform]);

  const [index, setIndex] = useState<number>(() => Math.floor(Math.random() * MESSAGES.length));
  const current = MESSAGES[index];
  const text = message ?? current.text;
  const ref = reference ?? current.reference;

  const handleTap = () => {
    onTap?.();
    if (cycleOnTap && !message) {
      const next = pickIndex(index);
      setIndex(next);
      onMessageChange?.(MESSAGES[next]);
    }
  };

  // Platform-tuned bubble palette (received message style).
  const ios = resolvedPlatform === 'ios';
  const bubbleBg = ios
    ? mode === 'dark'
      ? '#26252A' // iOS Messages received, dark
      : '#E9E9EB' // iOS Messages received, light
    : mode === 'dark'
      ? '#332B21' // Material surface variant, dark, amber-tinted
      : '#F0E5D2'; // Material surface variant, light, amber-tinted
  const bubbleText = ios ? (mode === 'dark' ? '#EDE8DF' : '#1C1712') : t.text;
  const subtle = mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(61,47,42,0.55)';

  return (
    <MediumWidgetFrame background={t.card} scale={scale} onTap={handleTap} ariaLabel="A message from God">
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: `${inset}px`,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          gap: `${5 * scale}px`,
        }}
      >
        {/* Header: avatar + sender · time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: `${7 * scale}px` }}>
          <div
            style={{
              width: `${22 * scale}px`,
              height: `${22 * scale}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, #F3D29A 0%, ${widgetTokens.amber} 70%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontFamily: fonts.sans,
              fontSize: `${10 * scale}px`,
              fontWeight: 600,
              boxShadow: `0 0 ${6 * scale}px rgba(196,149,106,0.35)`,
            }}
          >
            ✦
          </div>
          <span
            style={{
              color: t.text,
              fontFamily: fonts.sans,
              fontSize: `${10.5 * scale}px`,
              fontWeight: 600,
              letterSpacing: ios ? '-0.01em' : '0.01em',
            }}
          >
            God
          </span>
          <span
            style={{
              color: subtle,
              fontFamily: fonts.sans,
              fontSize: `${9 * scale}px`,
            }}
          >
            {ios ? `· ${timestamp}` : `· ${timestamp}`}
          </span>
          <span style={{ flex: 1 }} />
          <PlatformBadge platform={resolvedPlatform} scale={scale} mode={mode} />
        </div>

        {/* Bubble */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <div
            style={{
              alignSelf: 'flex-start',
              position: 'relative',
              maxWidth: '92%',
              backgroundColor: bubbleBg,
              padding: ios ? `${9 * scale}px ${13 * scale}px` : `${10 * scale}px ${14 * scale}px`,
              borderRadius: ios
                ? `${18 * scale}px`
                : // Material 3: large radius all corners except top-left (grouped received tail corner)
                  `${4 * scale}px ${18 * scale}px ${18 * scale}px ${18 * scale}px`,
              boxShadow: ios
                ? mode === 'dark'
                  ? '0 1px 0 rgba(255,255,255,0.03)'
                  : '0 1px 0 rgba(0,0,0,0.04)'
                : mode === 'dark'
                  ? '0 1px 2px rgba(0,0,0,0.4)'
                  : '0 1px 2px rgba(61,47,42,0.08)',
            }}
          >
            {/* iOS bubble tail (curved teardrop at bottom-left) */}
            {ios && (
              <svg
                viewBox="0 0 12 18"
                width={12 * scale}
                height={18 * scale}
                style={{
                  position: 'absolute',
                  left: `-${5 * scale}px`,
                  bottom: 0,
                  pointerEvents: 'none',
                }}
              >
                <path
                  d="M 12 0 V 14 Q 12 18 8 18 Q 3 18 0 16 Q 5 14 7 9 Q 9 4 9 0 Z"
                  fill={bubbleBg}
                />
              </svg>
            )}
            <p
              style={{
                color: bubbleText,
                fontFamily: fonts.serif,
                fontSize: `${12 * scale}px`,
                lineHeight: 1.34,
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
                marginTop: `${5 * scale}px`,
                color: widgetTokens.amber,
                fontFamily: fonts.sans,
                fontSize: `${8.5 * scale}px`,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {ref}
            </div>
          </div>

          {/* Status footer — iOS shows "Delivered", Android shows clock-style time */}
          <div
            style={{
              marginTop: `${4 * scale}px`,
              alignSelf: 'flex-end',
              color: subtle,
              fontFamily: fonts.sans,
              fontSize: `${8 * scale}px`,
              letterSpacing: ios ? '0' : '0.04em',
            }}
          >
            {ios ? 'Delivered' : timestamp.toUpperCase()}
          </div>
        </div>
      </div>
    </MediumWidgetFrame>
  );
}

/* Tiny corner badge so the platform skin is legible at a glance. */
function PlatformBadge({
  platform,
  scale,
  mode,
}: {
  platform: 'ios' | 'android';
  scale: number;
  mode: 'light' | 'dark';
}) {
  const color = mode === 'dark' ? 'rgba(237,232,223,0.55)' : 'rgba(61,47,42,0.45)';
  if (platform === 'ios') {
    // Apple-style speech bubble glyph
    return (
      <svg viewBox="0 0 16 16" width={11 * scale} height={11 * scale} aria-label="iMessage">
        <path
          d="M 8 1 C 4 1 1 3.5 1 7 C 1 8.6 1.7 10 2.8 11 L 2 14.5 L 5.6 13.2 C 6.3 13.4 7.1 13.5 8 13.5 C 12 13.5 15 11 15 7 C 15 3.5 12 1 8 1 Z"
          fill={color}
        />
      </svg>
    );
  }
  // Material chat bubble glyph
  return (
    <svg viewBox="0 0 16 16" width={11 * scale} height={11 * scale} aria-label="Messages">
      <path
        d="M 2 3 H 14 V 11 H 6 L 3 14 V 11 H 2 Z"
        fill={color}
      />
    </svg>
  );
}
