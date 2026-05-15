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

const SYCO_KEYWORDS = [
  'design', 'creative', 'visual', 'brand', 'generative', 'image', 'video', 'motion',
  'content', 'marketing', 'social', 'copy', 'writing', 'storytelling', 'campaign',
  'influencer', 'creator', 'newsletter', 'strategy',
  'developer', 'development', 'engineering', 'agent', 'automation', 'workflow',
  'code', 'api', 'integration', 'tool', 'platform', 'saas',
  'agency', 'productivity', 'collaboration',
]

const TEAM_KEYWORDS: Record<string, string[]> = {
  'creative-design': ['design', 'creative', 'visual', 'brand', 'generative', 'image', 'video', 'motion', 'art', 'graphic', 'runway', 'midjourney'],
  'social-content':  ['content', 'marketing', 'social', 'copy', 'writing', 'storytelling', 'campaign', 'newsletter', 'creator', 'ugc', 'influencer'],
  'development':     ['developer', 'development', 'engineering', 'agent', 'automation', 'code', 'api', 'integration', 'workflow', 'tool', 'platform'],
  'account':         ['client', 'roi', 'strategy', 'pitch', 'agency', 'business', 'management', 'brand', 'partnership', 'growth', 'sales'],
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
  return best
}
