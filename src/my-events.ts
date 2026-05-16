import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getMyEvents, setMyEvents, getNoteForEvent, saveNote } from './lib/store'
import { formatTime, speakerText, CATEGORY_COLORS, CATEGORY_LABELS, primaryCategory, eventsOverlap, timeToMinutes } from './lib/utils'
import { initEventModal, openEventModal, closeEventModal, modalToggleSave } from './lib/eventModal'
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

let currentView: 'list' | 'timeline' = 'list'
let currentDay = 1

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
  const countEl = document.getElementById('myevents-count')
  if (countEl) countEl.textContent = `${myIds.length} event${myIds.length !== 1 ? 's' : ''} saved`

  if (currentView === 'timeline') {
    renderTimeline()
  } else {
    renderList()
  }
}

// ─── List view ────────────────────────────────────────────────────────────────

function renderList() {
  const myIds = getMyEvents()
  const dateStr = currentDay === 1 ? '2026-05-19' : '2026-05-20'
  const myEvents = allEvents
    .filter(e => myIds.includes(e.id) && e.date === dateStr)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const container = document.getElementById('myevents-content')
  if (!container) return

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
  const dateStr = currentDay === 1 ? '2026-05-19' : '2026-05-20'
  const myEvents = allEvents
    .filter(e => myIds.includes(e.id) && e.date === dateStr)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

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

  const slots: string[] = []
  for (let h = 9; h <= 19; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`)
    if (h < 19) slots.push(`${h.toString().padStart(2, '0')}:30`)
  }

  const slotsHtml = slots.map(slot => {
    const slotMins = timeToMinutes(slot)
    const eventsInSlot = myEvents.filter(e => {
      const start = timeToMinutes(e.startTime)
      const end = timeToMinutes(e.endTime)
      return start <= slotMins && end > slotMins
    })
    const isHalf = slot.endsWith(':30')

    return `
      <div class="flex items-start gap-2 min-h-[52px] py-1" style="border-bottom:1px solid var(--border)">
        <div class="text-xs flex-shrink-0 w-12 pt-1" style="color:var(--text-2);text-align:right">${!isHalf ? slot : ''}</div>
        <div class="flex-1 flex flex-col gap-1 min-h-[36px]">
          ${eventsInSlot.map(e => {
            const catId = primaryCategory(e)
            const catColor = CATEGORY_COLORS[catId] || '#888'
            return `
              <div class="timeline-event-block cursor-pointer"
                   style="background:${catColor}22;color:${catColor};border-left:3px solid ${catColor};box-shadow:0 0 0 1px ${catColor}"
                   onclick="openEventModal('${e.id}')">
                <span class="font-semibold">${formatTime(e.startTime)}</span>
                <span class="ml-1 opacity-90">${e.title.substring(0, 45)}${e.title.length > 45 ? '…' : ''}</span>
              </div>
            `
          }).join('')}
        </div>
      </div>
    `
  }).join('')

  container.innerHTML = slotsHtml
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
