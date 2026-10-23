// build-verses.mjs — joins the curated emotion verse refs against the bundled
// full KJV + WEB datasets and emits app-frontend/src/messages/verses.json.
//
// Each ref in verse-refs.json is { book, chapter, verse, emotionId, emotionTags,
// tags, tier, weight, message }. We resolve the exact scripture text by lookup
// (never typed by hand), so KJV/WEB text can't be misquoted. Fails loudly if any
// ref does not resolve against the KJV dataset.
//
// Run: node scripts/build-verses.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const BIBLE = join(here, '..', 'app-frontend', 'src', 'bible')
const MESSAGES = join(here, 'verse-messages.json')

// Refs come from the stable base (verse-refs.json) plus any per-emotion
// expansion files (verse-refs.<emotion>.json). The base is always processed
// FIRST so the original 001..050 ids per emotion never shift; expansions append
// after (getting the next sequential ids within each emotion).
function refFilesInOrder() {
  const all = readdirSync(here).filter((f) => /^verse-refs.*\.json$/.test(f))
  const rest = all.filter((f) => f !== 'verse-refs.json').sort()
  return ['verse-refs.json', ...rest].filter((f) => all.includes(f))
}
const OUT = join(here, '..', 'app-frontend', 'src', 'messages', 'verses.json')

/** Key for the tie-in message map: emotion + colloquial reference. */
function msgKey(emotionId, book, chapter, verse) {
  return `${emotionId}|${book} ${chapter}:${verse}`
}

const EMOTION_ORDER = ['good', 'neutral', 'tired', 'sad', 'stressed']

// verse-refs uses the colloquial "Psalm"; both Bible datasets use "Psalms".
function normalizeBook(book) {
  return book === 'Psalm' ? 'Psalms' : book
}

/** Build { book -> { chapter -> { verse -> text } } } from a nested Bible JSON. */
function indexBible(data) {
  const idx = new Map()
  for (const b of data.books) {
    const chapters = new Map()
    for (const ch of b.chapters) {
      const verses = new Map()
      for (const v of ch.verses) verses.set(v.verse, v.text)
      chapters.set(ch.chapter, verses)
    }
    idx.set(b.book, chapters)
  }
  return idx
}

function lookup(idx, book, chapter, verse) {
  return idx.get(book)?.get(chapter)?.get(verse)
}

function cleanText(t) {
  return typeof t === 'string' ? t.replace(/\s+/g, ' ').trim() : undefined
}

const refFiles = refFilesInOrder()
const refs = refFiles.flatMap((f) => JSON.parse(readFileSync(join(here, f), 'utf-8')))
const kjv = indexBible(JSON.parse(readFileSync(join(BIBLE, 'kjv.json'), 'utf-8')))
const web = indexBible(JSON.parse(readFileSync(join(BIBLE, 'web_bible_nested.json'), 'utf-8')))

// Tie-in messages are authored separately (keyed by emotion|reference) so the
// ref list stays clean and messages can be added incrementally. An inline
// `message` on a ref still wins if present.
let messageMap = {}
try {
  messageMap = JSON.parse(readFileSync(MESSAGES, 'utf-8'))
} catch {
  messageMap = {}
}

const errors = []
const counters = Object.fromEntries(EMOTION_ORDER.map((e) => [e, 0]))
const seen = new Set()
let duplicates = 0
const out = []

for (const r of refs) {
  const dedupKey = msgKey(r.emotionId, r.book, r.chapter, r.verse)
  if (seen.has(dedupKey)) {
    duplicates += 1
    continue
  }
  seen.add(dedupKey)

  const book = normalizeBook(r.book)
  const body = cleanText(lookup(kjv, book, r.chapter, r.verse))
  const modernText = cleanText(lookup(web, book, r.chapter, r.verse))

  if (!body) {
    errors.push(`KJV missing: ${r.book} ${r.chapter}:${r.verse} (${r.emotionId})`)
    continue
  }
  if (!EMOTION_ORDER.includes(r.emotionId)) {
    errors.push(`Unknown emotionId "${r.emotionId}" for ${r.book} ${r.chapter}:${r.verse}`)
    continue
  }

  counters[r.emotionId] += 1
  const seq = String(counters[r.emotionId]).padStart(3, '0')
  const mapped = messageMap[msgKey(r.emotionId, r.book, r.chapter, r.verse)]
  const message = typeof r.message === 'string' && r.message.trim()
    ? r.message
    : typeof mapped === 'string'
      ? mapped
      : ''
  out.push({
    id: `${r.emotionId}-${seq}`,
    emotionId: r.emotionId,
    body,
    ...(modernText ? { modernText } : {}),
    reference: `${r.book} ${r.chapter}:${r.verse}`, // keep colloquial "Psalm" for display
    message,
    tags: Array.isArray(r.tags) ? r.tags : [],
    tier: r.tier === 'premium' ? 'premium' : 'free',
    weight: typeof r.weight === 'number' ? r.weight : 5,
  })
}

if (errors.length) {
  console.error(`\n✖ ${errors.length} ref(s) failed to resolve:\n` + errors.map((e) => '  - ' + e).join('\n'))
  process.exit(1)
}

// Order output by emotion (Good→…→Stressed) then by id for stable diffs.
out.sort((a, b) => {
  const ea = EMOTION_ORDER.indexOf(a.emotionId)
  const eb = EMOTION_ORDER.indexOf(b.emotionId)
  return ea !== eb ? ea - eb : a.id.localeCompare(b.id)
})

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf-8')

const withMsg = out.filter((v) => v.message.trim()).length
const withModern = out.filter((v) => v.modernText).length
console.log(`✔ Wrote ${out.length} verses → ${OUT}`)
console.log('  from ref files: ' + refFiles.join(', '))
console.log('  per emotion: ' + EMOTION_ORDER.map((e) => `${e}=${counters[e]}`).join('  '))
if (duplicates) console.log(`  skipped ${duplicates} duplicate ref(s)`)
console.log(`  with WEB modernText: ${withModern}/${out.length}`)
console.log(`  with authored message: ${withMsg}/${out.length}`)
