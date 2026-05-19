import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getMyEvents, setMyEvents, getNoteForEvent, saveNote } from './lib/store'
import { formatTime, speakerText, CATEGORY_COLORS, CATEGORY_LABELS, primaryCategory, eventsOverlap, timeToMinutes, isEnglishEvent } from './lib/utils'
import { initEventModal, openEventModal, closeEventModal, modalToggleSave, setModalNavList, modalNavPrev, modalNavNext } from './lib/eventModal'
import type { Event } from './lib/types'
import eventsData from './data/events.json'

const allEvents: Event[] = eventsData.events as Event[]

;(window as any).Alpine = Alpine
Alpine.start()
initApp('my-events')
initEventModal(allEvents, () => renderMyEvents())

;(window as any).openEventModal = openEventModal
;(window as any).closeEventModal = closeEventModal
;(window as any).modalToggleSave = modalToggleSave
;(window as any).modalNavPrev = modalNavPrev
;(window as any).modalNavNext = modalNavNext

let currentView: 'list' | 'timeline' = 'list'
let currentDay = 1
let showEnglishOnly = false

const _now = new Date()
if (_now.getFullYear() === 2026 && _now.getMonth() === 4 && _now.getDate() === 20) {
  currentDay = 2
}

let currentNoteEventId: string | null = null
let currentNotesTab: 'text' | 'images' | 'audio' = 'text'
let mediaRecorder: MediaRecorder | null = null
let recordingChunks: Blob[] = []
let recordingInterval: ReturnType<typeof setInterval> | null = null
let recordingSeconds = 0
let currentImages: string[] = []

function showToast(msg: string) {
  const existing = document.querySelector('.toast')
  if (existing) existing.remove()
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2500)
}

// ─── Render dispatcher ────────────────────────────────────────────────────────

function renderMyEvents() {
  const myIds = getMyEvents()
  const filtered = getMyFiltered()
  const countEl = document.getElementById('myevents-count')
  if (countEl) {
    const total = myIds.length
    const shown = filtered.length
    countEl.textContent = showEnglishOnly
      ? `${shown} English · ${total} saved`
      : `${total} event${total !== 1 ? 's' : ''} saved`
  }

  if (currentView === 'timeline') {
    renderTimeline()
  } else {
    renderList()
  }
}

// ─── List view ────────────────────────────────────────────────────────────────

function getMyFiltered() {
  const myIds = getMyEvents()
  const dateStr = currentDay === 1 ? '2026-05-19' : '2026-05-20'
  return allEvents
    .filter(e => myIds.includes(e.id) && e.date === dateStr && (!showEnglishOnly || isEnglishEvent(e)))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

function renderList() {
  const myIds = getMyEvents()
  const myEvents = getMyFiltered()

  const container = document.getElementById('myevents-content')
  if (!container) return

  setModalNavList(myEvents.map(e => e.id))

  if (myIds.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16">
        <div class="text-4xl mb-4">📋</div>
        <div class="font-semibold text-base mb-2" style="color:var(--text-1)">No events saved yet</div>
        <div class="text-sm mb-6" style="color:var(--text-2)">Browse events and save the ones you want to attend</div>
        <a href="events.html" class="btn-primary" style="text-decoration:none;display:inline-block">Browse Events</a>
      </div>
    `
    return
  }

  if (myEvents.length === 0) {
    container.innerHTML = `
      <div class="event-card text-center py-8" style="color:var(--text-2)">
        No saved events on Day ${currentDay}<br>
        <a href="events.html" style="color:var(--accent);margin-top:8px;display:inline-block;font-size:12px">Browse events →</a>
      </div>
    `
    return
  }

  container.innerHTML = myEvents.map((event, i) => renderMyEventCard(event, myEvents, i)).join('')
}

function renderMyEventCard(event: Event, dayEvents: Event[], index: number): string {
  const catId = primaryCategory(event)
  const catColor = CATEGORY_COLORS[catId]
  const catLabel = CATEGORY_LABELS[catId]

  const prevEvent = index > 0 ? dayEvents[index - 1] : null
  const conflictWithPrev = prevEvent && eventsOverlap(event, prevEvent)

  const note = getNoteForEvent(event.id)
  const hasNote = note.text || note.images.length > 0 || note.audioUrl

  return `
    ${conflictWithPrev ? `
      <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium" style="background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.3)">
        ⚡ Time conflict with previous event
      </div>
    ` : ''}
    <div class="event-card ${conflictWithPrev ? 'conflict' : ''}" style="border-left:3px solid ${catColor}">
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0 cursor-pointer" onclick="openEventModal('${event.id}')">
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            <span style="font-size:11px;font-weight:600;color:${catColor}">${formatTime(event.startTime)} – ${formatTime(event.endTime)}</span>
            <span class="cat-badge cat-${catId}">${catLabel}</span>
            ${hasNote ? `<span class="cat-badge" style="background:var(--accent-dim);color:var(--accent)">📝 Note</span>` : ''}
          </div>
          <div class="font-semibold text-sm leading-snug" style="color:var(--text-1)">${event.title}</div>
          ${event.speakers.length ? `<div class="text-xs mt-1" style="color:var(--text-2)">${speakerText(event)}</div>` : ''}
          <div class="text-xs mt-0.5" style="color:var(--text-2);opacity:0.6">${event.stage}</div>
        </div>
        <button onclick="removeEvent('${event.id}')" class="btn-icon flex-shrink-0" title="Remove" style="border-color:var(--danger);color:var(--danger)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
      <button onclick="openNotesModal('${event.id}')" class="btn-ghost w-full text-xs mt-3" style="padding:8px;min-height:36px">
        ${hasNote ? '📝 View Notes' : '+ Add Note'}
      </button>
    </div>
  `
}

// ─── Timeline view ────────────────────────────────────────────────────────────

function renderTimeline() {
  const myIds = getMyEvents()
  const myEvents = getMyFiltered()

  setModalNavList(myEvents.map(e => e.id))

  const container = document.getElementById('timeline-content')
  if (!container) return

  if (myIds.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16">
        <div class="font-semibold text-base mb-2" style="color:var(--text-1)">No events saved yet</div>
        <a href="events.html" class="btn-primary" style="text-decoration:none;display:inline-block;margin-top:8px">Browse Events</a>
      </div>
    `
    return
  }

  if (myEvents.length === 0) {
    container.innerHTML = `<div class="event-card text-center py-8" style="color:var(--text-2)">No saved events on Day ${currentDay}</div>`
    return
  }

  const HOUR_H = 80
  const TSTART = 9 * 60
  const GUTTER = 44
  const COL_W = 160
  const HEADER_H = 36
  const PX_MIN = HOUR_H / 60

  // One column per stage, sorted by earliest saved event in that stage
  const stageFirst = new Map<string, number>()
  myEvents.forEach(e => {
    const t = timeToMinutes(e.startTime)
    const cur = stageFirst.get(e.stage)
    if (cur === undefined || t < cur) stageFirst.set(e.stage, t)
  })
  const stages = [...stageFirst.keys()].sort((a, b) => stageFirst.get(a)! - stageFirst.get(b)!)
  const stageCol = new Map(stages.map((s, i) => [s, i]))
  const totalW = GUTTER + stages.length * COL_W

  const headersHtml =
    `<div style="position:absolute;top:0;left:0;width:${totalW}px;height:${HEADER_H}px;background:var(--bg-elevated);border-bottom:2px solid var(--border);pointer-events:none"></div>` +
    stages.map((stage, i) => {
      const left = GUTTER + i * COL_W
      return `<div style="position:absolute;top:0;left:${left + 1}px;width:${COL_W - 2}px;height:${HEADER_H}px;padding:0 7px;font-size:10px;font-weight:700;letter-spacing:0.03em;color:var(--text-1);display:flex;align-items:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${stage}</div>`
    }).join('')

  const vSepsHtml =
    `<div style="position:absolute;top:0;left:${GUTTER}px;width:1px;height:100%;background:var(--border);pointer-events:none"></div>` +
    stages.slice(1).map((_, i) => {
      const left = GUTTER + (i + 1) * COL_W
      return `<div style="position:absolute;top:${HEADER_H}px;left:${left}px;width:1px;height:${11 * HOUR_H}px;background:var(--border);opacity:0.4;pointer-events:none"></div>`
    }).join('')

  const hoursHtml = Array.from({ length: 12 }, (_, i) => {
    const h = 9 + i
    const top = HEADER_H + i * HOUR_H
    return `<div style="position:absolute;top:${top}px;left:0;width:${totalW}px;display:flex;align-items:flex-start;pointer-events:none">
      <span style="width:${GUTTER}px;flex-shrink:0;font-size:10px;color:var(--text-2);text-align:right;padding-right:6px;margin-top:-7px">${h.toString().padStart(2, '0')}:00</span>
      <div style="flex:1;border-top:1px solid var(--border)"></div>
    </div>`
  }).join('')

  const halfHtml = Array.from({ length: 11 }, (_, i) => {
    const top = HEADER_H + i * HOUR_H + HOUR_H / 2
    return `<div style="position:absolute;top:${top}px;left:${GUTTER}px;width:${totalW - GUTTER}px;border-top:1px dashed var(--border);opacity:0.3;pointer-events:none"></div>`
  }).join('')

  const blocksHtml = myEvents.map(e => {
    const catId = primaryCategory(e)
    const catColor = CATEGORY_COLORS[catId] || '#888'
    const catLabel = CATEGORY_LABELS[catId] || catId
    const note = getNoteForEvent(e.id)
    const hasNote = note.text || note.images.length > 0 || note.audioUrl
    const col = stageCol.get(e.stage) ?? 0
    const startMins = timeToMinutes(e.startTime) - TSTART
    const durMins = timeToMinutes(e.endTime) - timeToMinutes(e.startTime)
    const top = HEADER_H + startMins * PX_MIN
    const height = Math.max(durMins * PX_MIN, 22)
    const left = GUTTER + col * COL_W + 2
    const width = COL_W - 4
    return `<div class="cursor-pointer" onclick="openEventModal('${e.id}')"
         style="position:absolute;top:${top}px;left:${left}px;width:${width}px;height:${height}px;
                background:${catColor}22;border-left:3px solid ${catColor};color:${catColor};
                border-radius:4px;padding:3px 6px;overflow:hidden;
                box-shadow:0 0 0 1px ${catColor}">
      <div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3">${formatTime(e.startTime)} ${e.title}${hasNote ? ' 📝' : ''}</div>
      ${height >= 30 ? `<div style="font-size:10px;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3">${catLabel}</div>` : ''}
    </div>`
  }).join('')

  const totalH = HEADER_H + 11 * HOUR_H
  container.innerHTML = `<div style="position:relative;width:${totalW}px;height:${totalH}px">${headersHtml}${vSepsHtml}${hoursHtml}${halfHtml}${blocksHtml}</div>`
}

// ─── View / day switchers ─────────────────────────────────────────────────────

;(window as any).myEventsSetDay = (day: number) => {
  currentDay = day
  document.getElementById('day1-tab')?.classList.toggle('active', day === 1)
  document.getElementById('day2-tab')?.classList.toggle('active', day === 2)
  renderMyEvents()
}

;(window as any).myEventsSetView = (view: 'list' | 'timeline') => {
  currentView = view
  document.getElementById('list-view')?.classList.toggle('hidden', view !== 'list')
  document.getElementById('timeline-view')?.classList.toggle('hidden', view !== 'timeline')

  const listBtn = document.getElementById('view-list-btn')
  const timelineBtn = document.getElementById('view-timeline-btn')
  if (listBtn && timelineBtn) {
    if (view === 'list') {
      listBtn.style.cssText = 'background:var(--accent);color:white'
      timelineBtn.style.cssText = 'background:transparent;color:var(--text-2)'
    } else {
      timelineBtn.style.cssText = 'background:var(--accent);color:white'
      listBtn.style.cssText = 'background:transparent;color:var(--text-2)'
    }
  }
  renderMyEvents()
}

;(window as any).myEventsToggleEnglish = () => {
  showEnglishOnly = !showEnglishOnly
  const btn = document.getElementById('english-filter-btn')
  if (btn) {
    btn.style.background = showEnglishOnly ? 'rgba(34,197,94,0.15)' : 'transparent'
    btn.style.color = showEnglishOnly ? '#22c55e' : 'var(--text-2)'
    btn.style.borderColor = showEnglishOnly ? '#22c55e' : 'var(--border)'
  }
  renderMyEvents()
}

// ─── Event handlers ───────────────────────────────────────────────────────────

;(window as any).removeEvent = (id: string) => {
  const ids = getMyEvents().filter(i => i !== id)
  setMyEvents(ids)
  renderMyEvents()
  showToast('Removed from My List')
}

;(window as any).openNotesModal = (eventId: string) => {
  currentNoteEventId = eventId
  const event = allEvents.find(e => e.id === eventId)
  if (!event) return

  const titleEl = document.getElementById('notes-event-title')
  if (titleEl) titleEl.textContent = event.title

  const note = getNoteForEvent(eventId)
  const textEl = document.getElementById('notes-text') as HTMLTextAreaElement
  if (textEl) textEl.value = note.text || ''

  currentImages = [...(note.images || [])]
  renderImagePreviews()

  const audioPlayer = document.getElementById('notes-audio-player') as HTMLAudioElement
  const audioPlayback = document.getElementById('audio-playback')
  if (audioPlayer && audioPlayback) {
    if (note.audioUrl) {
      audioPlayer.src = note.audioUrl
      audioPlayback.classList.remove('hidden')
    } else {
      audioPlayback.classList.add('hidden')
    }
  }

  ;(window as any).notesSetTab('text')
  document.getElementById('notes-modal')?.classList.add('is-open')
}

;(window as any).closeNotesModal = (e?: MouseEvent) => {
  if (!e || e.target === document.getElementById('notes-modal')) {
    if (currentNoteEventId) {
      const text = (document.getElementById('notes-text') as HTMLTextAreaElement)?.value || ''
      saveNote(currentNoteEventId, { text })
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      if (recordingInterval) { clearInterval(recordingInterval); recordingInterval = null }
      document.getElementById('record-btn')!.textContent = '🎙 Start Recording'
      document.getElementById('recording-indicator')?.classList.add('hidden')
      document.getElementById('recording-time')?.classList.add('hidden')
    }
    document.getElementById('notes-modal')?.classList.remove('is-open')
    currentNoteEventId = null
    renderMyEvents()
  }
}

;(window as any).notesSetTab = (tab: 'text' | 'images' | 'audio') => {
  currentNotesTab = tab
  const tabs = ['text', 'images', 'audio']
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`)
    const content = document.getElementById(`notes-tab-${t}`)
    if (btn) {
      btn.style.background = t === tab ? 'var(--accent)' : 'transparent'
      btn.style.color = t === tab ? 'white' : 'var(--text-2)'
    }
    content?.classList.toggle('hidden', t !== tab)
  })
}

;(window as any).saveNoteText = () => {
  if (!currentNoteEventId) return
  const text = (document.getElementById('notes-text') as HTMLTextAreaElement)?.value || ''
  saveNote(currentNoteEventId, { text })
  renderMyEvents()
  showToast('Note saved')
}

;(window as any).addNoteImages = (event: Event) => {
  const input = (event as unknown as { target: HTMLInputElement }).target
  const files = Array.from(input.files || [])
  input.value = ''
  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      currentImages.push(dataUrl)
      if (currentNoteEventId) saveNote(currentNoteEventId, { images: currentImages })
      renderImagePreviews()
      renderMyEvents()
    }
    reader.readAsDataURL(file)
  })
}

function renderImagePreviews() {
  const container = document.getElementById('notes-images-preview')
  if (!container) return
  container.innerHTML = currentImages.map((src, i) => `
    <div class="relative">
      <img src="${src}" class="w-full aspect-square object-cover rounded-lg" />
      <button onclick="removeImage(${i})" class="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs" style="background:rgba(0,0,0,0.7);color:white">✕</button>
    </div>
  `).join('')
}

;(window as any).removeImage = (index: number) => {
  currentImages.splice(index, 1)
  if (currentNoteEventId) saveNote(currentNoteEventId, { images: currentImages })
  renderImagePreviews()
  renderMyEvents()
}

;(window as any).toggleRecording = async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
    if (recordingInterval) clearInterval(recordingInterval)
    document.getElementById('record-btn')!.textContent = '🎙 Start Recording'
    document.getElementById('recording-indicator')?.classList.add('hidden')
    document.getElementById('recording-time')?.classList.add('hidden')
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    recordingChunks = []
    recordingSeconds = 0
    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (e) => recordingChunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunks, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        if (currentNoteEventId) saveNote(currentNoteEventId, { audioUrl: dataUrl })
        const audioPlayer = document.getElementById('notes-audio-player') as HTMLAudioElement
        const audioPlayback = document.getElementById('audio-playback')
        if (audioPlayer) audioPlayer.src = dataUrl
        audioPlayback?.classList.remove('hidden')
        renderMyEvents()
        showToast('Audio saved')
      }
      reader.readAsDataURL(blob)
      stream.getTracks().forEach(t => t.stop())
    }

    mediaRecorder.start()
    document.getElementById('record-btn')!.textContent = '⏹ Stop Recording'
    document.getElementById('recording-indicator')?.classList.remove('hidden')
    document.getElementById('recording-time')?.classList.remove('hidden')

    recordingInterval = setInterval(() => {
      recordingSeconds++
      const m = Math.floor(recordingSeconds / 60)
      const s = recordingSeconds % 60
      const el = document.getElementById('recording-time')
      if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`
    }, 1000)
  } catch {
    showToast('Microphone access denied')
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.getElementById('day1-tab')?.classList.toggle('active', currentDay === 1)
document.getElementById('day2-tab')?.classList.toggle('active', currentDay === 2)
renderMyEvents()
