import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getMyEvents, setMyEvents, getNoteForEvent, saveNote } from './lib/store'
import { formatTime, speakerText, CATEGORY_COLORS, CATEGORY_LABELS, primaryCategory, eventsOverlap, timeToMinutes } from './lib/utils'
import type { Event } from './lib/types'
import eventsData from './data/events.json'

const allEvents: Event[] = eventsData.events as Event[]

;(window as any).Alpine = Alpine
Alpine.start()
initApp('my-events')

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

function renderMyEvents() {
  const myIds = getMyEvents()
  const myEvents = allEvents
    .filter(e => myIds.includes(e.id))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    })

  const countEl = document.getElementById('myevents-count')
  if (countEl) countEl.textContent = `${myEvents.length} event${myEvents.length !== 1 ? 's' : ''} saved`

  const container = document.getElementById('myevents-content')
  if (!container) return

  if (myEvents.length === 0) {
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

  // Group by day
  const day1 = myEvents.filter(e => e.date === '2026-05-19')
  const day2 = myEvents.filter(e => e.date === '2026-05-20')

  let html = ''

  if (day1.length > 0) {
    html += `<div class="section-header">DAY 1 · MAY 19</div><div class="space-y-3 mb-6">`
    html += day1.map((event, i) => renderMyEventCard(event, day1, i)).join('')
    html += `</div>`
  }

  if (day2.length > 0) {
    html += `<div class="section-header">DAY 2 · MAY 20</div><div class="space-y-3">`
    html += day2.map((event, i) => renderMyEventCard(event, day2, i)).join('')
    html += `</div>`
  }

  container.innerHTML = html
}

function renderMyEventCard(event: Event, dayEvents: Event[], index: number): string {
  const catId = primaryCategory(event)
  const catColor = CATEGORY_COLORS[catId]
  const catLabel = CATEGORY_LABELS[catId]

  // Check conflict with previous event in the day
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
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            <span style="font-size:11px;font-weight:600;color:${catColor}">${formatTime(event.startTime)} – ${formatTime(event.endTime)}</span>
            <span class="cat-badge cat-${catId}">${catLabel}</span>
            ${hasNote ? `<span class="cat-badge" style="background:var(--accent-dim);color:var(--accent)">📝 Note</span>` : ''}
          </div>
          <div class="font-semibold text-sm leading-snug" style="color:var(--text-1)">${event.title}</div>
          ${event.speakers.length ? `<div class="text-xs mt-1" style="color:var(--text-2)">${speakerText(event)}</div>` : ''}
          <div class="text-xs mt-0.5" style="color:var(--text-2);opacity:0.6">${event.stage}</div>
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <button onclick="openNotesModal('${event.id}')" class="btn-ghost flex-1 text-xs" style="padding:8px;min-height:36px">
          ${hasNote ? '📝 View Notes' : '+ Add Note'}
        </button>
        <button onclick="removeEvent('${event.id}')" class="btn-icon" title="Remove" style="border-color:var(--danger);color:var(--danger)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
  `
}

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

  // Load audio
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
    // Auto-save text if there's content and we have an active event
    if (currentNoteEventId) {
      const text = (document.getElementById('notes-text') as HTMLTextAreaElement)?.value || ''
      saveNote(currentNoteEventId, { text })
    }
    // Stop any active recording so it saves before nulling the event ID
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
  input.value = '' // reset so same file can be re-selected
  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      currentImages.push(dataUrl)
      if (currentNoteEventId) {
        saveNote(currentNoteEventId, { images: currentImages })
      }
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
    // Stop
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

renderMyEvents()
