import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getMyEvents, getProfile } from './lib/store'
import { formatTime, speakerText, CATEGORY_COLORS, CATEGORY_LABELS, primaryCategory, getEventDay, isSuggestedEvent, getEventPrimaryTeam } from './lib/utils'
import type { Event, CategoryId } from './lib/types'
import eventsData from './data/events.json'

const allEvents: Event[] = eventsData.events as Event[]

;(window as any).Alpine = Alpine
Alpine.start()

// Determine current day for display
let currentDay = 1
const today = new Date()
if (today.getFullYear() === 2026 && today.getMonth() === 4 && today.getDate() === 20) {
  currentDay = 2
}

function renderEventCard(event: Event, compact = false): string {
  const catId = primaryCategory(event)
  const catColor = CATEGORY_COLORS[catId] || '#888'
  const catLabel = CATEGORY_LABELS[catId] || catId

  return `
    <div class="event-card" onclick="window.location.href='events.html?highlight=${event.id}'">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span style="font-size:11px;font-weight:600;color:${catColor}">${formatTime(event.startTime)} – ${formatTime(event.endTime)}</span>
            <span class="cat-badge cat-${catId}" style="font-size:10px">${catLabel}</span>
          </div>
          <div class="font-semibold text-sm leading-snug" style="color:var(--text-1)">${event.title}</div>
          ${event.speakers.length ? `<div class="text-xs mt-1 truncate" style="color:var(--text-2)">${speakerText(event)}</div>` : ''}
          <div class="text-xs mt-0.5" style="color:var(--text-2);opacity:0.7">${event.stage}</div>
        </div>
      </div>
    </div>
  `
}

function renderNowSection(day: number) {
  const dateStr = day === 1 ? '2026-05-19' : '2026-05-20'
  const now = new Date()
  let nowMins: number

  // For demo/non-event days, show first events of the day
  if (today.getFullYear() === 2026 && today.getMonth() === 4 &&
      (today.getDate() === 19 || today.getDate() === 20)) {
    nowMins = now.getHours() * 60 + now.getMinutes()
  } else {
    // Demo mode: show 11:30-12:00 slot
    nowMins = 11 * 60 + 45
  }

  const nowEvents = allEvents.filter(e => {
    if (e.date !== dateStr) return false
    const start = e.startTime.split(':').map(Number)
    const end = e.endTime.split(':').map(Number)
    const startM = start[0] * 60 + start[1]
    const endM = end[0] * 60 + end[1]
    return nowMins >= startM && nowMins < endM
  })

  const container = document.getElementById('now-events')
  if (!container) return

  if (nowEvents.length === 0) {
    container.innerHTML = `<div class="event-card text-center py-5" style="color:var(--text-2);font-size:13px;">No events happening right now</div>`
    return
  }
  container.innerHTML = nowEvents.map(e => renderEventCard(e)).join('')
}

function renderUpNext(day: number) {
  const dateStr = day === 1 ? '2026-05-19' : '2026-05-20'
  const myEventIds = getMyEvents()
  const now = new Date()
  let nowMins: number

  if (today.getFullYear() === 2026 && today.getMonth() === 4 &&
      (today.getDate() === 19 || today.getDate() === 20)) {
    nowMins = now.getHours() * 60 + now.getMinutes()
  } else {
    nowMins = 11 * 60 + 30
  }

  // Prefer My Events, fallback to all
  let source = myEventIds.length > 0
    ? allEvents.filter(e => myEventIds.includes(e.id) && e.date === dateStr)
    : allEvents.filter(e => e.date === dateStr)

  const upNext = source
    .filter(e => {
      const [h, m] = e.startTime.split(':').map(Number)
      return h * 60 + m > nowMins
    })
    .sort((a, b) => {
      const [ah, am] = a.startTime.split(':').map(Number)
      const [bh, bm] = b.startTime.split(':').map(Number)
      return (ah * 60 + am) - (bh * 60 + bm)
    })
    .slice(0, 3)

  const container = document.getElementById('upnext-events')
  if (!container) return

  if (upNext.length === 0) {
    container.innerHTML = `<div class="event-card text-center py-5" style="color:var(--text-2);font-size:13px;">
      No upcoming events<br><a href="events.html" style="color:var(--accent);font-size:12px;margin-top:6px;display:inline-block;">Browse all events →</a>
    </div>`
    return
  }
  container.innerHTML = upNext.map(e => renderEventCard(e)).join('')
}

const TEAM_LABELS: Record<string, string> = {
  'social-content':  'FOR SOCIAL / CONTENT',
  'creative-design': 'FOR CREATIVE / DESIGN',
  'development':     'FOR DEVELOPMENT',
}

function renderSuggested(day: number) {
  const profile = getProfile()
  const section = document.getElementById('suggested-section')
  if (!section) return

  if (!profile.role) {
    section.classList.add('hidden')
    return
  }

  section.classList.remove('hidden')

  const header = document.getElementById('suggested-header')
  if (header) header.textContent = TEAM_LABELS[profile.role] || 'SUGGESTED FOR YOU'

  const dateStr = day === 1 ? '2026-05-19' : '2026-05-20'
  const suggestions = allEvents
    .filter(e => e.date === dateStr && isSuggestedEvent(e))
    .filter(e => {
      const team = getEventPrimaryTeam(e)
      return !team || team === profile.role
    })
    .slice(0, 4)

  const container = document.getElementById('suggested-events')
  if (!container) return

  container.innerHTML = suggestions.length
    ? suggestions.map(e => renderEventCard(e)).join('')
    : `<div class="event-card text-center py-5" style="color:var(--text-2);font-size:13px;">No specific picks for your team on this day</div>`
}

function updateMyEventsSummary() {
  const count = getMyEvents().length
  const summary = document.getElementById('my-events-summary')
  const heroCount = document.getElementById('my-events-hero-count')
  if (!summary || !heroCount) return
  if (count === 0) {
    summary.textContent = 'No events saved yet — browse to add'
    heroCount.classList.add('hidden')
  } else {
    summary.textContent = `${count} event${count !== 1 ? 's' : ''} saved`
    heroCount.textContent = String(count)
    heroCount.classList.remove('hidden')
  }
}

;(window as any).dashboardSetDay = (day: number) => {
  currentDay = day
  const btn1 = document.getElementById('day1-btn')
  const btn2 = document.getElementById('day2-btn')
  btn1?.classList.toggle('active', day === 1)
  btn2?.classList.toggle('active', day === 2)

  const subtitle = document.getElementById('header-subtitle')
  if (subtitle) subtitle.textContent = day === 1 ? 'Day 1 · May 19, 2026' : 'Day 2 · May 20, 2026'

  renderNowSection(day)
  renderUpNext(day)
  renderSuggested(day)
}

initApp('dashboard')
;(window as any).dashboardSetDay(currentDay)
updateMyEventsSummary()

window.addEventListener('myevents-changed', updateMyEventsSummary)
