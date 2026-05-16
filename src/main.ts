import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getMyEvents, getProfile } from './lib/store'
import { formatTime, speakerText, CATEGORY_COLORS, CATEGORY_LABELS, primaryCategory, isSuggestedEvent, getEventPrimaryTeam } from './lib/utils'
import { initEventModal, openEventModal, closeEventModal, modalToggleSave, setModalNavList, modalNavPrev, modalNavNext } from './lib/eventModal'
import type { Event } from './lib/types'
import eventsData from './data/events.json'

const allEvents: Event[] = eventsData.events as Event[]

;(window as any).Alpine = Alpine
Alpine.start()

initEventModal(allEvents, updateMyEventsSummary)

;(window as any).openEventModal = openEventModal
;(window as any).closeEventModal = closeEventModal
;(window as any).modalToggleSave = modalToggleSave
;(window as any).modalNavPrev = modalNavPrev
;(window as any).modalNavNext = modalNavNext

// ─── Time helpers ────────────────────────────────────────────────────────────

const EVENT_START = new Date(2026, 4, 19, 9, 0)   // May 19 09:00 local
const EVENT_END   = new Date(2026, 4, 20, 20, 0)  // May 20 20:00 local

function getDeviceDayStatus(day: number): 'live' | 'other-day' | 'before' | 'after' {
  const now = new Date()
  const targetDate = day === 1 ? 19 : 20

  if (now.getFullYear() === 2026 && now.getMonth() === 4 && now.getDate() === targetDate) {
    return 'live'
  }
  if (now < EVENT_START) return 'before'
  if (now > EVENT_END)   return 'after'
  return 'other-day'
}

function daysUntilEvent(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const start = new Date(2026, 4, 19)
  return Math.ceil((start.getTime() - now.getTime()) / 86400000)
}

// ─── Auto-select current day ──────────────────────────────────────────────────

let currentDay = 1
const now = new Date()
if (now.getFullYear() === 2026 && now.getMonth() === 4 && now.getDate() === 20) {
  currentDay = 2
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderEventCard(event: Event): string {
  const catId = primaryCategory(event)
  const catColor = CATEGORY_COLORS[catId] || '#888'
  const catLabel = CATEGORY_LABELS[catId] || catId

  return `
    <div class="event-card cursor-pointer" onclick="openEventModal('${event.id}')">
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

function emptyCard(msg: string): string {
  return `<div class="event-card text-center py-5" style="color:var(--text-2);font-size:13px">${msg}</div>`
}

// ─── Now section ──────────────────────────────────────────────────────────────

function renderNowSection(day: number) {
  const container = document.getElementById('now-events')
  if (!container) return

  const status = getDeviceDayStatus(day)

  if (status !== 'live') {
    if (status === 'before') {
      const d = daysUntilEvent()
      container.innerHTML = emptyCard(`Event starts in ${d} day${d !== 1 ? 's' : ''} · May 19–20, Fiera Milano`)
    } else if (status === 'after') {
      container.innerHTML = emptyCard('Event has ended. See you next year!')
    } else {
      // other-day: user selected a day that isn't today
      const liveDay = now.getDate() === 19 ? 1 : 2
      container.innerHTML = emptyCard(
        `Today is Day ${liveDay} — <a href="#" onclick="dashboardSetDay(${liveDay});return false" style="color:var(--accent)">switch to Day ${liveDay}</a> to see live events`
      )
    }
    return
  }

  // Live: compare real device time with event times
  const dateStr = day === 1 ? '2026-05-19' : '2026-05-20'
  const nowMins = now.getHours() * 60 + now.getMinutes()

  const nowEvents = allEvents.filter(e => {
    if (e.date !== dateStr) return false
    const [sh, sm] = e.startTime.split(':').map(Number)
    const [eh, em] = e.endTime.split(':').map(Number)
    return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em
  })

  container.innerHTML = nowEvents.length
    ? nowEvents.map(e => renderEventCard(e)).join('')
    : emptyCard('No events happening right now')
}

// ─── Up Next section ──────────────────────────────────────────────────────────

function renderUpNext(day: number) {
  const container = document.getElementById('upnext-events')
  if (!container) return

  const status = getDeviceDayStatus(day)
  const dateStr = day === 1 ? '2026-05-19' : '2026-05-20'
  const myEventIds = getMyEvents()

  let nowMins: number
  if (status === 'live') {
    nowMins = now.getHours() * 60 + now.getMinutes()
  } else if (status === 'before' || status === 'other-day') {
    nowMins = 0  // show all upcoming events from the start of the day
  } else {
    container.innerHTML = emptyCard('Event has ended.')
    return
  }

  const source = myEventIds.length > 0
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
      return ah * 60 + am - (bh * 60 + bm)
    })
    .slice(0, 3)

  container.innerHTML = upNext.length
    ? upNext.map(e => renderEventCard(e)).join('')
    : `<div class="event-card text-center py-5" style="color:var(--text-2);font-size:13px;">
        No upcoming events<br><a href="events.html" style="color:var(--accent);font-size:12px;margin-top:6px;display:inline-block;">Browse all events →</a>
      </div>`
}

// ─── Suggested section ────────────────────────────────────────────────────────

const TEAM_LABELS: Record<string, string> = {
  'social-content':  'FOR SOCIAL / CONTENT',
  'creative-design': 'FOR CREATIVE / DESIGN',
  'development':     'FOR TECH / DEV',
  'account':         'FOR ACCOUNT',
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
    : emptyCard('No specific picks for your team on this day')
}

// ─── My Events summary ────────────────────────────────────────────────────────

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

// ─── Day switcher ─────────────────────────────────────────────────────────────

;(window as any).dashboardSetDay = (day: number) => {
  currentDay = day
  document.getElementById('day1-btn')?.classList.toggle('active', day === 1)
  document.getElementById('day2-btn')?.classList.toggle('active', day === 2)

  const subtitle = document.getElementById('header-subtitle')
  if (subtitle) subtitle.textContent = day === 1 ? 'Day 1 · May 19, 2026' : 'Day 2 · May 20, 2026'

  renderNowSection(day)
  renderUpNext(day)
  renderSuggested(day)

  const dateStr = day === 1 ? '2026-05-19' : '2026-05-20'
  setModalNavList(
    allEvents
      .filter(e => e.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(e => e.id)
  )
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

initApp('dashboard')
;(window as any).dashboardSetDay(currentDay)
updateMyEventsSummary()

window.addEventListener('myevents-changed', updateMyEventsSummary)
