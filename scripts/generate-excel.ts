import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const eventsPath = path.join(__dirname, '../src/data/events.json')
const { events } = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'))

type Event = {
  id: string
  title: string
  speakers: { name: string; role?: string }[]
  date: string
  startTime: string
  endTime: string
  stage: string
  categories: string[]
  tags: string[]
}

function formatDate(d: string) {
  return d === '2026-05-19' ? 'May 19, 2026 (Day 1)' : 'May 20, 2026 (Day 2)'
}

function speakerNames(e: Event) {
  return e.speakers.map(s => s.role ? `${s.name} (${s.role})` : s.name).join(', ')
}

function toRow(e: Event) {
  return {
    Title: e.title,
    'Speaker(s)': speakerNames(e),
    Date: formatDate(e.date),
    Start: e.startTime,
    End: e.endTime,
    Stage: e.stage,
    Categories: e.categories.join(', '),
    Tags: e.tags.join(', '),
  }
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function eventsOverlap(a: Event, b: Event) {
  if (a.date !== b.date) return false
  const aStart = timeToMinutes(a.startTime)
  const aEnd = timeToMinutes(a.endTime)
  const bStart = timeToMinutes(b.startTime)
  const bEnd = timeToMinutes(b.endTime)
  return aStart < bEnd && bStart < aEnd
}

// ─── Category tabs ──────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  'ai-play-stage':   'AI Play Stage',
  'agentic-ai':      'Agentic AI',
  'featured':        'Featured',
  'robotics':        'Robotics',
  'podcast-tv-stage': 'Podcast-TV Stage',
}

const wb = XLSX.utils.book_new()

for (const [catId, tabName] of Object.entries(CATEGORY_MAP)) {
  const filtered: Event[] = (events as Event[])
    .filter((e: Event) => e.categories.includes(catId))
    .sort((a: Event, b: Event) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    })
  const ws = XLSX.utils.json_to_sheet(filtered.map(toRow))
  setColWidths(ws)
  XLSX.utils.book_append_sheet(wb, ws, tabName)
}

// ─── Suggestions tab ────────────────────────────────────────────────────────

const SUGGESTION_KEYWORDS = [
  // Creative & Design
  'design', 'creative', 'visual', 'brand', 'generative', 'image', 'video', 'motion',
  'midjourney', 'stable diffusion', 'dall-e', 'runway', 'sora', 'art', 'graphic',
  // Content & Social
  'content', 'marketing', 'social', 'copy', 'writing', 'storytelling', 'campaign',
  'influencer', 'creator', 'ugc', 'newsletter', 'strategy',
  // Development & Tech
  'developer', 'development', 'engineering', 'agent', 'automation', 'workflow',
  'code', 'api', 'integration', 'tool', 'platform', 'saas', 'product',
  // Agency work
  'agency', 'client', 'pitch', 'roi', 'productivity', 'collaboration', 'future of work',
]

function relevanceScore(e: Event): { score: number; team: string; why: string } {
  const text = `${e.title} ${e.tags.join(' ')} ${speakerNames(e)}`.toLowerCase()

  const matchedKeywords = SUGGESTION_KEYWORDS.filter(k => text.includes(k))
  const score = matchedKeywords.length

  // Determine primary team relevance
  const designHits = ['design', 'creative', 'visual', 'brand', 'generative', 'image', 'video', 'midjourney', 'art', 'graphic', 'runway', 'sora'].filter(k => text.includes(k))
  const contentHits = ['content', 'marketing', 'social', 'copy', 'writing', 'storytelling', 'campaign', 'newsletter', 'creator', 'ugc'].filter(k => text.includes(k))
  const devHits = ['developer', 'development', 'engineering', 'agent', 'automation', 'code', 'api', 'integration', 'workflow', 'tool', 'platform'].filter(k => text.includes(k))

  const maxHits = Math.max(designHits.length, contentHits.length, devHits.length)

  let team = 'All Teams'
  if (maxHits > 0) {
    if (designHits.length === maxHits) team = 'Creative/Design'
    else if (contentHits.length === maxHits) team = 'Social/Content'
    else team = 'Development'
  }

  const why = matchedKeywords.length > 0
    ? `Matches: ${matchedKeywords.slice(0, 5).join(', ')}`
    : 'General AI relevance for creative agencies'

  return { score, team, why }
}

const suggestionsRaw: Event[] = (events as Event[])
  .map((e: Event) => ({ e, ...relevanceScore(e) }))
  .filter(({ score }) => score >= 2)
  .sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.e.date !== b.e.date) return a.e.date.localeCompare(b.e.date)
    return timeToMinutes(a.e.startTime) - timeToMinutes(b.e.startTime)
  })
  .map(({ e, team, why }) => ({
    Title: e.title,
    'Speaker(s)': speakerNames(e),
    Date: formatDate(e.date),
    Start: e.startTime,
    End: e.endTime,
    Stage: e.stage,
    'Relevant Team': team,
    'Why Attend': why,
    Categories: e.categories.join(', '),
  }))

const wsSuggestions = XLSX.utils.json_to_sheet(suggestionsRaw)
setColWidths(wsSuggestions, true)
XLSX.utils.book_append_sheet(wb, wsSuggestions, 'Suggestions')

// ─── Conflicts tab ───────────────────────────────────────────────────────────

type ConflictGroup = {
  Day: string
  'Time Slot': string
  Event1: string
  'Time 1': string
  Stage1: string
  Event2: string
  'Time 2': string
  Stage2: string
  Categories: string
}

const conflictRows: ConflictGroup[] = []
const allEvents: Event[] = events as Event[]

for (let i = 0; i < allEvents.length; i++) {
  for (let j = i + 1; j < allEvents.length; j++) {
    const a = allEvents[i]
    const b = allEvents[j]
    if (eventsOverlap(a, b)) {
      conflictRows.push({
        Day: a.date === '2026-05-19' ? 'Day 1 (May 19)' : 'Day 2 (May 20)',
        'Time Slot': `${a.startTime}–${a.endTime}`,
        Event1: a.title,
        'Time 1': `${a.startTime}–${a.endTime}`,
        Stage1: a.stage,
        Event2: b.title,
        'Time 2': `${b.startTime}–${b.endTime}`,
        Stage2: b.stage,
        Categories: [...new Set([...a.categories, ...b.categories])].join(', '),
      })
    }
  }
}

conflictRows.sort((a, b) => {
  if (a.Day !== b.Day) return a.Day.localeCompare(b.Day)
  return a['Time Slot'].localeCompare(b['Time Slot'])
})

const wsConflicts = XLSX.utils.json_to_sheet(conflictRows)
setColWidths(wsConflicts)
XLSX.utils.book_append_sheet(wb, wsConflicts, 'Conflicts')

// ─── Write file ──────────────────────────────────────────────────────────────

const outPath = path.join(__dirname, '../aiweek-events.xlsx')
XLSX.writeFile(wb, outPath)
console.log(`✓ Excel written to ${outPath}`)
console.log(`  • ${Object.keys(CATEGORY_MAP).length} category tabs`)
console.log(`  • ${suggestionsRaw.length} suggestions`)
console.log(`  • ${conflictRows.length} conflict pairs`)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setColWidths(ws: XLSX.WorkSheet, suggestions = false) {
  const cols = suggestions
    ? [{ wch: 55 }, { wch: 35 }, { wch: 22 }, { wch: 8 }, { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 50 }, { wch: 30 }]
    : [{ wch: 55 }, { wch: 35 }, { wch: 22 }, { wch: 8 }, { wch: 8 }, { wch: 25 }, { wch: 30 }, { wch: 40 }]
  ws['!cols'] = cols
}
