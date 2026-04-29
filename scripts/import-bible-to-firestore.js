const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

const serviceAccount = require('./service-account-key.json')
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const KJV_PATH = path.join(__dirname, '../app-frontend/src/bible/kjv.json')
const WEB_PATH = path.join(__dirname, '../app-frontend/src/bible/web_bible_nested.json')
const REFS_PATH = path.join(__dirname, './verse-refs.json')

console.log('Loading Bible files (this may take a moment)...')
const kjv = JSON.parse(fs.readFileSync(KJV_PATH, 'utf8'))
const web = JSON.parse(fs.readFileSync(WEB_PATH, 'utf8'))
const verseRefs = JSON.parse(fs.readFileSync(REFS_PATH, 'utf8'))
console.log(`KJV: ${kjv.books.length} books | WEB: ${web.books.length} books | Curated refs: ${verseRefs.length}`)

// Map ref book names → exact names used inside the JSON files
const BOOK_ALIAS = {
  'Psalm': 'Psalms',
  'Song of Songs': 'Song of Solomon',
  'Revelations': 'Revelation',
}
const resolveBookName = name => BOOK_ALIAS[name] || name

// Stable Firestore doc ID: "psalms_34_18", "1_peter_5_7"
const docId = (bookName, chapter, verse) =>
  bookName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + `_${chapter}_${verse}`

// Build WEB index: bookName → chapter → verse → text  (O(1) lookups)
console.log('Building WEB index...')
const webIndex = new Map()
for (const book of web.books) {
  const chMap = new Map()
  for (const ch of book.chapters) {
    const vMap = new Map()
    for (const v of ch.verses) vMap.set(v.verse, v.text)
    chMap.set(ch.chapter, vMap)
  }
  webIndex.set(book.book, chMap)
}

const normalizeWEB = text =>
  text
    ? text.replace(/\bYahweh's\b/g, "the Lord's").replace(/\bYahweh\b/g, 'the Lord')
    : null

// Build curated multi-map: docId → [{ emotionId, tier, weight, tags }, ...]
// A single verse (e.g. Isaiah 40:31) may be curated for several emotions.
const curatedMulti = new Map()
for (const ref of verseRefs) {
  const resolved = resolveBookName(ref.book)
  const id = docId(resolved, ref.chapter, ref.verse)
  if (!curatedMulti.has(id)) curatedMulti.set(id, [])
  curatedMulti.get(id).push({
    emotionId: ref.emotionId,
    tier: ref.tier,
    weight: ref.weight,
    tags: ref.tags,
  })
}
console.log(`Unique curated verse positions: ${curatedMulti.size} (from ${verseRefs.length} refs)`)

// Verify all curated refs resolve to real KJV verses before writing anything
const kjvIds = new Set()
for (const book of kjv.books)
  for (const ch of book.chapters)
    for (const v of ch.verses)
      kjvIds.add(docId(book.book, ch.chapter, v.verse))

let unresolvedCount = 0
for (const [id, refs] of curatedMulti) {
  if (!kjvIds.has(id)) {
    const r = refs[0]
    console.warn(`  WARN unresolved: ${id} (from ${r.emotionId} ref)`)
    unresolvedCount++
  }
}
if (unresolvedCount > 0) {
  console.error(`\n${unresolvedCount} curated refs not found in KJV — check BOOK_ALIAS or verse-refs.json`)
  process.exit(1)
}
console.log('All curated refs verified ✓')

// Collect every verse from KJV with WEB + curated data
console.log('Building verse list...')
const allVerses = []
let webMissCount = 0

for (const book of kjv.books) {
  for (const ch of book.chapters) {
    for (const v of ch.verses) {
      const id = docId(book.book, ch.chapter, v.verse)
      const rawWEB = webIndex.get(book.book)?.get(ch.chapter)?.get(v.verse) ?? null
      if (!rawWEB) webMissCount++

      const curatedRefs = curatedMulti.get(id) ?? null

      // emotionMeta: { [emotionId]: { tier, weight, tags } }
      // This lets the selector look up per-emotion tier/weight without re-querying.
      const emotionMeta = {}
      const emotionTags = []
      if (curatedRefs) {
        for (const ref of curatedRefs) {
          emotionTags.push(ref.emotionId)
          emotionMeta[ref.emotionId] = {
            tier: ref.tier,
            weight: ref.weight,
            tags: ref.tags,
          }
        }
      }

      allVerses.push({
        id,
        doc: {
          book: book.book,
          testament: book.testament ?? null,
          bookOrder: book.book_order ?? null,
          chapter: ch.chapter,
          verse: v.verse,
          reference: `${book.book} ${ch.chapter}:${v.verse}`,
          kjv: v.text,
          web: normalizeWEB(rawWEB),
          isCurated: !!curatedRefs,
          emotionTags,   // array-contains queryable
          emotionMeta,   // per-emotion { tier, weight, tags }
        },
      })
    }
  }
}

console.log(`Total verses: ${allVerses.length} | WEB misses: ${webMissCount}`)

// Write to Firestore in batches of 500
const BATCH_SIZE = 500
const col = db.collection('verses')

async function run() {
  const total = allVerses.length
  let committed = 0
  let batchNum = 0

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = allVerses.slice(i, i + BATCH_SIZE)
    const batch = db.batch()
    for (const { id, doc } of chunk) {
      batch.set(col.doc(id), doc)
    }
    await batch.commit()
    committed += chunk.length
    batchNum++
    process.stdout.write(`\r  Batch ${batchNum}: ${committed}/${total} verses written...`)
  }

  console.log(`\n\nDone! ${committed} verses imported in ${batchNum} batches.`)
  console.log(`Curated verse positions: ${curatedMulti.size}`)
  console.log(`Total curated emotion-verse mappings: ${verseRefs.length}`)
}

run().catch(err => {
  console.error('\nImport failed:', err.message)
  process.exit(1)
})
