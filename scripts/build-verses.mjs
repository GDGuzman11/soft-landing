// build-verses.mjs — joins the curated emotion verse refs against the bundled
// full KJV + WEB datasets and emits app-frontend/src/messages/verses.json.
//
// Each ref in verse-refs.json is { book, chapter, verse, emotionId, emotionTags,
// tags, tier, weight, message }. We resolve the exact scripture text by lookup
// (never typed by hand), so KJV/WEB text can't be misquoted. Fails loudly if any
// ref does not resolve against the KJV dataset.
//
// Run: node scripts/build-verses.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const BIBLE = join(here, '..', 'app-frontend', 'src', 'bible')
const REFS = join(here, 'verse-refs.json')
const OUT = join(here, '..', 'app-frontend', 'src', 'messages', 'verses.json')

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

const refs = JSON.parse(readFileSync(REFS, 'utf-8'))
const kjv = indexBible(JSON.parse(readFileSync(join(BIBLE, 'kjv.json'), 'utf-8')))
const web = indexBible(JSON.parse(readFileSync(join(BIBLE, 'web_bible_nested.json'), 'utf-8')))

const errors = []
const counters = Object.fromEntries(EMOTION_ORDER.map((e) => [e, 0]))
const out = []

for (const r of refs) {
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
  out.push({
    id: `${r.emotionId}-${seq}`,
    emotionId: r.emotionId,
    body,
    ...(modernText ? { modernText } : {}),
    reference: `${r.book} ${r.chapter}:${r.verse}`, // keep colloquial "Psalm" for display
    message: typeof r.message === 'string' ? r.message : '',
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
console.log('  per emotion: ' + EMOTION_ORDER.map((e) => `${e}=${counters[e]}`).join('  '))
console.log(`  with WEB modernText: ${withModern}/${out.length}`)
console.log(`  with authored message: ${withMsg}/${out.length}`)
