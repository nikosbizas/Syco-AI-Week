import type { Event, CategoryId } from './types'

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  'ai-play-stage':   'AI Play Stage',
  'agentic-ai':      'Agentic AI',
  'featured':        'Featured',
  'robotics':        'Robotics',
  'podcast-tv-stage':'Podcast/TV',
  'standup':         'Standup',
  'startup':         'Startup',
  'meetup':          'Meetup',
  'regulation':      'Regulation',
  'healthcare':      'Healthcare',
  'ai-sport':        'AI Sport',
  'charity':         'Charity',
  'general':         'Stage',
}

export const CATEGORY_COLORS: Record<CategoryId, string> = {
  'ai-play-stage':   '#06b6d4',
  'agentic-ai':      '#8b5cf6',
  'featured':        '#f59e0b',
  'robotics':        '#10b981',
  'podcast-tv-stage':'#f43f5e',
  'standup':         '#f97316',
  'startup':         '#3b82f6',
  'meetup':          '#a855f7',
  'regulation':      '#64748b',
  'healthcare':      '#14b8a6',
  'ai-sport':        '#22c55e',
  'charity':         '#ec4899',
  'general':         '#6b7280',
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`
}

export function eventsOverlap(a: Event, b: Event): boolean {
  if (a.date !== b.date || a.id === b.id) return false
  return timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
}

export function hasConflict(event: Event, myEventIds: string[], allEvents: Event[]): boolean {
  return allEvents
    .filter(e => myEventIds.includes(e.id) && e.id !== event.id)
    .some(me => eventsOverlap(event, me))
}

export function getEventDay(date: string): number {
  return date === '2026-05-19' ? 1 : 2
}

export function speakerText(event: Event): string {
  if (!event.speakers.length) return ''
  return event.speakers.slice(0, 2)
    .map(s => s.name + (s.company ? ` · ${s.company}` : ''))
    .join(', ') + (event.speakers.length > 2 ? ` +${event.speakers.length - 2}` : '')
}

export function primaryCategory(event: Event): CategoryId {
  return event.categories[0] || 'general'
}

export function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('light', theme === 'light')
}

export function applyAccentColor(accent: string) {
  document.documentElement.style.setProperty('--accent', accent)
  const hex = accent.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  document.documentElement.style.setProperty('--accent-dim', `rgba(${r},${g},${b},0.15)`)
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

// What makes an event relevant for Syco (creative agency)
const SYCO_KEYWORDS = [
  // Marketing & digital presence
  'marketing', 'advertising', 'campaign', 'audience', 'brand',
  'social media', 'content creation', 'content marketing', 'influencer',
  'seo', 'geo ', 'organic', 'search optim', 'visibility',
  'awareness', 'engagement', 'conversion',
  // Creative production
  'creative', 'design', 'visual', 'generative',
  'image', 'video', 'animation',
  'commercial', 'commercials', 'storytelling',
  'diffusion', 'midjourney', 'runway',
  'creative direction', 'art direction',
  // Agency & client business
  'agency', 'agencies', 'client', 'pitch', 'new business',
  'revenue stream', 'roi', 'selling',
  // Tools for creative teams & dev workflow
  'workflow', 'no-code', 'prompt', 'productivity',
  'creative brief', 'dal brief',
  'coding', 'claude code', 'vibe coding',
]

const TEAM_KEYWORDS: Record<string, string[]> = {
  // Social/Content: advertising, digital presence, brand voice, SEO/GEO
  'social-content': [
    'social media', 'paid social', 'social network',
    'advertising', 'digital advertising', 'ad campaign', 'ads ',
    'content creation', 'content marketing', 'content strategy', 'editorial',
    'newsletter', 'email campaign', 'copywriting', 'copywriter',
    'influencer', 'creator economy', 'ugc',
    'seo', 'geo ', 'organic search', 'search optim', 'answer engine',
    'audience', 'engagement', 'community management',
    'brand awareness', 'brand voice', 'brand relevance',
    'commercial', 'commercials',
    'awareness', 'consideration',
    'digital marketing', 'performance marketing',
    'tiktok', 'instagram', 'linkedin', 'youtube',
  ],
  // Creative/Design: craft, visual production, AI creative tools
  'creative-design': [
    'creative', 'visual', 'generative',
    'image', 'video', 'animation',
    'creative direction', 'creative director', 'augmented creative',
    'art direction', 'art director',
    'visual identity', 'brand identity', 'graphic design', 'typography',
    'diffusion', 'midjourney', 'runway', 'stable diffusion', 'higgsfield',
    'image generation', 'image synthesis', 'video generation',
    'motion graphic', 'animation studio', 'cinematic',
    'design system', 'ui design', 'ux design', 'illustration',
    'creative brief', 'dal brief', 'brief alla campagna',
    'creative workflow', 'generative art', 'generative image',
    'prompt engineering', 'augmented direction',
    'color grading', 'visual storytelling', 'sketch',
  ],
  // Development: building, coding, integrations, AI dev tools
  'development': [
    'mcp', 'model context protocol',
    'claude code', 'vibe coding', 'cursor ai',
    'no-code', 'nocode', 'low-code',
    'rag ', 'retrieval augmented', 'vector database',
    'api ', 'sdk ', 'open source',
    'code generation', 'pair programming', 'copilot',
    'deployment', 'devops', 'ci/cd', 'github',
    'prompt to production', 'agentic development',
    'agentic self-healing', 'agent framework',
    'developer experience', 'build ai',
  ],
  // Account: agency business model, client strategy, new revenue, pitching
  'account': [
    'agency', 'agencies', 'post-agency', 'agentification',
    'client service', 'client relation',
    'new business', 'pitch', 'b2b',
    'revenue stream', 'new revenue', 'monetiz',
    'selling', 'sales methodology', 'sales team',
    'roi', 'return on investment',
    'marketing agency', 'creative agency',
    'professional services', 'consultancy',
    'business case', 'from agencies to agents',
    'winning client', 'c-suite', 'cmo', 'cdo',
  ],
}

export function isSuggestedEvent(event: Event): boolean {
  const text = `${event.title} ${event.description || ''} ${event.speakers.map(s => s.name).join(' ')}`.toLowerCase()
  return SYCO_KEYWORDS.filter(k => text.includes(k)).length >= 2
}

export function getEventPrimaryTeam(event: Event): string {
  const text = `${event.title} ${event.description || ''}`.toLowerCase()
  let best = ''
  let bestScore = 0
  for (const [team, keywords] of Object.entries(TEAM_KEYWORDS)) {
    const score = keywords.filter(k => text.includes(k)).length
    if (score > bestScore) { bestScore = score; best = team }
  }
  // Only assign team if at least 1 specific keyword matched
  return bestScore >= 1 ? best : ''
}

// ─── English filter ──────────────────────────────────────────────────────────
// Detects Italian-language events by looking for Italian-specific words/accents
// in the title and description. If none are found the talk is likely in English.
const ITALIAN_MARKERS = [
  /\b(della|delle|degli|del|dei|dal|dalla|dalle|dagli)\b/i,
  /\b(nel|nella|nelle|negli|nello|sui|sulla|sulle|sugli)\b/i,
  /\b(questo|questa|questi|queste|anche|però|quando|mentre|sempre)\b/i,
  /\b(intelligenza|artificiale|azienda|impresa|lavoro|futuro)\b/i,
  /[àèìòùé]/,
]

export function isEnglishEvent(event: Event): boolean {
  const text = (event.title + ' ' + (event.description || '')).toLowerCase()
  return !ITALIAN_MARKERS.some(p => p.test(text))
}

export interface EventColumn {
  event: Event
  col: number
  totalCols: number
}

export function calculateColumns(events: Event[]): EventColumn[] {
  if (!events.length) return []
  const sorted = [...events].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  const cols: number[] = new Array(sorted.length).fill(0)
  const colEnds: number[] = []

  for (let i = 0; i < sorted.length; i++) {
    const start = timeToMinutes(sorted[i].startTime)
    let c = -1
    for (let ci = 0; ci < colEnds.length; ci++) {
      if (colEnds[ci] <= start) { c = ci; break }
    }
    if (c === -1) c = colEnds.length
    cols[i] = c
    colEnds[c] = timeToMinutes(sorted[i].endTime)
  }

  const result: EventColumn[] = sorted.map((event, i) => ({ event, col: cols[i], totalCols: 1 }))
  for (let i = 0; i < result.length; i++) {
    let maxCol = result[i].col
    for (let j = 0; j < result.length; j++) {
      if (i !== j && eventsOverlap(result[i].event, result[j].event)) maxCol = Math.max(maxCol, result[j].col)
    }
    result[i].totalCols = maxCol + 1
  }
  return result
}
