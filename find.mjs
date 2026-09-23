#!/usr/bin/env node
// find.mjs — the agent-facing query surface over this component bank.
//
// Reads index.jsonl (one JSON object per line; the 5 Sep release replaced
// classification.json + harvest/ with it) and streams it line by line, scoring
// every record against the query words. An agent asked to "build a pricing
// page" gets a handful of ranked candidates with preview paths instead of
// grepping 8,539 folders or loading the whole catalogue into context.
//
//   node find.mjs pricing                        # free text; default --limit 12
//   node find.mjs "testimonial card" --limit 3
//   node find.mjs card --category pricing        # --tag is an alias
//   node find.mjs hero --source-only             # only records with code.tsx
//   node find.mjs --categories                   # category vocabulary (--tags)
//   node find.mjs pricing --json                 # machine-readable, abs paths
//
// Scoring per record: +3 per query word found in name or slug, +3 per word
// found in a structured classification tag (category, subcategory, visual_style,
// interactions, best_for_industries, platform_fit, complexity; prose keys such
// as ai_summary/use_cases and _-prefixed metadata are not tags), +1 per word
// found in the description. Records scoring 0 are dropped. Then
// +log10(usage_count + 1) and +1 when the source is actually retrievable.
// Sort: score desc, then usage_count desc. No dependencies beyond Node's stdlib.

import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const INDEX = join(HERE, 'index.jsonl')

const args = process.argv.slice(2)
const flagValue = n => (args.includes(n) ? args[args.indexOf(n) + 1] : null)

const JSON_OUT = args.includes('--json')
const LIST_CATS = args.includes('--categories') || args.includes('--tags')
const SOURCE_ONLY = args.includes('--source-only')
const CATEGORY = flagValue('--category') ?? flagValue('--tag')

const limitRaw = flagValue('--limit')
const limitNum = Number(limitRaw)
const LIMIT = Number.isFinite(limitNum) && limitNum >= 1 ? Math.floor(limitNum) : 12

const VALUE_FLAGS = new Set(['--limit', '--category', '--tag'])
const words = []
for (let i = 0; i < args.length; i++) {
  if (VALUE_FLAGS.has(args[i])) { i++; continue }
  if (args[i].startsWith('--')) continue
  words.push(args[i])
}
const query = words.join(' ').trim()

if (!query && !LIST_CATS) {
  console.error('usage: node find.mjs <text> [--limit N] [--category C] [--json] [--source-only]')
  console.error('       node find.mjs --categories          # alias: --tags')
  process.exit(1)
}

const norm = s => String(s).toLowerCase().replace(/[-_\s]+/g, ' ').trim()
const asList = v => (Array.isArray(v) ? v : v == null ? [] : [v]).filter(x => typeof x === 'string' && x.trim())

const PROSE_KEYS = new Set(['ai_summary', 'use_cases'])
function tagsOf(c) {
  const out = []
  for (const [k, v] of Object.entries(c ?? {})) {
    if (k.startsWith('_') || PROSE_KEYS.has(k)) continue
    out.push(...asList(v))
  }
  return out
}
const catsOf = c => asList(c?.category)
const subOf = c => asList(c?.subcategory).join(', ')

const terms = [...new Set(norm(query).split(' ').filter(Boolean))]
const wanted = CATEGORY ? norm(CATEGORY) : null

// 1,002 records set has_source: true while carrying no source path at all, so
// the flag alone would let --source-only return hits that print "no source".
// Effective has_source means the code is actually retrievable.
const hasSource = rec => rec.has_source === true && typeof rec.source === 'string' && rec.source.trim() !== ''

const baseScore = rec => {
  const nameSlug = norm(rec.name ?? '') + ' ' + norm(rec.slug ?? '')
  const tags = tagsOf(rec.classification).map(norm)
  const desc = norm(rec.description ?? '')
  let s = 0
  for (const t of terms) {
    if (nameSlug.includes(t)) s += 3
    if (tags.some(tag => tag.includes(t))) s += 3
    if (desc.includes(t)) s += 1
  }
  return s
}

const hits = []
const catCounts = new Map()
let skipped = 0

const rl = createInterface({ input: createReadStream(INDEX, 'utf8'), crlfDelay: Infinity })
for await (const line of rl) {
  const raw = line.trim()
  if (!raw) continue
  let rec
  try { rec = JSON.parse(raw) } catch { skipped++; continue }

  const cats = catsOf(rec.classification)

  if (LIST_CATS) {
    for (const c of cats) {
      const k = norm(c)
      const seen = catCounts.get(k)
      if (seen) seen.count++
      else catCounts.set(k, { label: c, count: 1 })
    }
    continue
  }

  if (wanted && !cats.some(c => norm(c) === wanted)) continue
  if (SOURCE_ONLY && !hasSource(rec)) continue

  const base = baseScore(rec)
  if (base === 0) continue

  const usage = Number(rec.usage_count) || 0
  hits.push({
    rec,
    cats,
    sub: subOf(rec.classification),
    usage,
    score: base + Math.log10(usage + 1) + (hasSource(rec) ? 1 : 0),
  })
}

if (skipped) console.error(`warning: skipped ${skipped} unparseable line(s) in index.jsonl`)

if (LIST_CATS) {
  const order = [...catCounts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  for (const { label, count } of order) console.log(`${count}  ${label}`)
  process.exit(0)
}

hits.sort((a, b) =>
  b.score - a.score ||
  b.usage - a.usage ||
  String(a.rec.id).localeCompare(String(b.rec.id))
)
const out = hits.slice(0, LIMIT)

const abs = p => (p ? (isAbsolute(p) ? p : join(HERE, p)) : null)

if (JSON_OUT) {
  console.log(JSON.stringify(out.map(({ rec, cats, sub, usage, score }) => ({
    id: rec.id,
    name: rec.name,
    url: rec.url,
    description: rec.description,
    category: cats,
    subcategory: sub,
    usage_count: usage,
    source: abs(rec.source),
    preview: abs(rec.preview),
    score: Math.round(score * 1000) / 1000,
  })), null, 2))
  process.exit(0)
}

if (!out.length) {
  console.log(`no matches for ${query}`)
  process.exit(0)
}

for (const { rec, cats, sub, usage } of out) {
  const label = [cats.join(', ') || 'unclassified', sub].filter(Boolean).join('/')
  console.log(`${rec.id}  ${label}  ${usage} installs  ${rec.source || 'no source'}`)
  console.log(`  ${rec.preview || 'no preview'}`)
}
