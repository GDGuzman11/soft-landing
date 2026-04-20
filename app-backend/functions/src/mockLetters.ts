import type { EmotionId } from './types'

// Pre-written letters used when ANTHROPIC_API_KEY is not set (dev/test mode).
// Each letter omits "Dear [name]," and "With you in this." — the UI adds those.
// These follow the same three-act structure as the real prompt:
//   1. Meet them in the feeling
//   2. Let the verse be the turning point
//   3. Leave them stronger

const MOCK_LETTERS: Record<EmotionId, string[]> = {
  stressed: [
    `There's something about the kind of stress you're carrying that makes everything feel urgent and nothing feel manageable at the same time. That particular weight — the kind that follows you to bed and greets you in the morning — it's real, and it costs something to carry it.

But this verse didn't land in your hands by accident today. It wasn't written for people who were slightly inconvenienced. It was written for people exactly where you are right now.

You don't have to figure everything out tonight. You don't have to have the answer by morning. What you have is a promise that the One who holds everything is not rattled by what's rattling you. That's not nothing — that's everything. You are more grounded than you feel right now, and more capable than this season is making you believe.`,

    `The weight of a stretched-thin life is its own kind of exhaustion — not just tired in body but tired in the space behind your eyes, tired in the part of you that keeps showing up anyway.

And you keep showing up. That matters more than you know.

This verse found you today because something in it belongs to this moment. Not as a command to do better or feel less, but as a reminder that you are not carrying this alone. There is a presence that meets you in the middle of full calendars and impossible to-do lists — a presence that is not disappointed in you. It is with you. And you, even now, have more in you than this season is asking.`,
  ],

  tired: [
    `Tired isn't always just physical, is it. Sometimes it's the accumulated weight of caring, of giving, of showing up day after day for things and people that matter. That kind of tired goes deeper than sleep can fix.

This verse met you here today — not because you need to try harder, but because you need to be reminded of something true. You are seen in your tiredness. The God who holds the whole world also notices when you're running on empty, and He doesn't ask you to be full right now.

Rest is not the same as giving up. Slowness is not the same as failure. You are allowed to exhale. You are held — and that holding is not conditional on what you produce today.`,

    `There's a particular kind of tired that comes from caring about things deeply. You feel it not because you've been lazy, but because you've been present — for others, for your work, for the things that matter. That costs something real.

Today's verse is a word for the weary — not a rebuke, not a challenge. Just an open hand. Come. Rest. Not because you've earned it, but because you need it, and because you are worth caring for too.

You give so much. You don't have to give everything. There is enough grace here for you to receive something today, not just pour it out. Let something fill you back up. You are more than what you produce, and today that's okay to simply believe.`,
  ],

  sad: [
    `Sadness has a weight to it that words sometimes can't quite hold. And sometimes it doesn't need explanation — it just needs to be named. What you're feeling is real. It isn't weakness. It's what it looks like to have loved something, or wanted something, or lost something that mattered.

This verse chose you today. It wasn't written for the ones who have it together or who've already found their footing. It was written for the broken ones — for you, right here, in this.

You are not too far gone for comfort to find you. Whatever has cracked open in you today — that's exactly where light gets in. You are closer to grace than you feel, and you are more held than you know.`,

    `There is a kind of sadness that is quiet and heavy — the kind that sits with you even in rooms full of people. It doesn't always have a clean explanation. Sometimes it just arrives and asks you to make space for it.

This verse found you in that space today. It doesn't rush you past the sadness — it sits down in it with you. That's what real closeness looks like: not fixing, just staying.

You are not alone in what you're carrying. And this heaviness, as real as it is, does not define what comes next. You have survived every hard day so far — every single one. That is not a small thing. Something in you keeps going, and today, that something is enough.`,
  ],

  neutral: [
    `There is something quietly faithful about the ordinary days — the ones that don't feel particularly high or low, just steady. And steadiness, it turns out, is its own kind of grace.

This verse arrived in your hands today not to shake up the ordinary but to remind you that even here, even in the middle of routine and normalcy, you are not forgotten. You are not overlooked just because you don't feel a crisis or a peak.

Ordinary moments are where most of life actually happens. And you, showing up to this moment, choosing to check in, choosing to be present — that's a small act of faithfulness that matters more than you think. You don't have to feel something electric for today to count. You're here. That is genuinely enough.`,

    `Not every day is a dramatic one, and that's not a failure — it's just the steady middle of life where nothing is falling apart and nothing is soaring either. Just living.

Today's verse is a word for exactly this kind of moment. And in the quiet in-between, this is still true: you are known. You are cared for. The ordinary texture of your life is not invisible to the One who made you.

Let this be a day where you carry a little less weight, even if nothing changes on the outside. You are more than what you feel or produce. You simply are — and that, right now, is more than enough.`,
  ],

  good: [
    `There is something worth pausing for in a day that feels good — a moment of actual lightness, of things being okay. These days are worth receiving fully, not rushing past.

This verse landed in a good day for a reason. Not to remind you of what could go wrong, but to anchor the goodness. What you're feeling right now is a gift, and it is okay to let yourself have it completely — to be grateful without immediately bracing for something else.

You deserve good days. Let this one settle into you. Let it remind you what peace feels like so you can find your way back to it when harder days come. Today is evidence that it's possible. You are okay. You are more than okay, and that is worth sitting with.`,

    `Something is lighter today, and that matters. Good days aren't accidental — they're worth noticing, worth receiving, worth saying thank you for.

This verse found you in a good moment, and that's not wasted. There is something about gratitude that multiplies what it touches. When we notice grace in the good seasons, it builds something in us that holds through the harder ones.

You are in a good place right now. Let yourself be in it fully. Let the lightness be real. You don't have to earn this or explain it — good things happen to you because you are someone worth good things happening to. Receive today completely.`,
  ],
}

export function getRandomMockLetter(emotionId: EmotionId): string {
  const letters = MOCK_LETTERS[emotionId] ?? MOCK_LETTERS.neutral
  return letters[Math.floor(Math.random() * letters.length)]
}
