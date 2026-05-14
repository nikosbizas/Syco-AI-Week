import type { MyEvents, Note, Profile } from './types'

const KEYS = {
  MY_EVENTS: 'syco_my_events',
  NOTES: 'syco_notes',
  PROFILE: 'syco_profile',
}

export function getMyEvents(): MyEvents {
  try { return JSON.parse(localStorage.getItem(KEYS.MY_EVENTS) || '[]') } catch { return [] }
}

export function setMyEvents(ids: MyEvents): void {
  localStorage.setItem(KEYS.MY_EVENTS, JSON.stringify(ids))
  window.dispatchEvent(new CustomEvent('myevents-changed', { detail: ids.length }))
}

export function toggleMyEvent(id: string): boolean {
  const ids = getMyEvents()
  const idx = ids.indexOf(id)
  if (idx === -1) { ids.push(id); setMyEvents(ids); return true }
  ids.splice(idx, 1); setMyEvents(ids); return false
}

export function isMyEvent(id: string): boolean {
  return getMyEvents().includes(id)
}

export function getNotes(): Record<string, Note> {
  try { return JSON.parse(localStorage.getItem(KEYS.NOTES) || '{}') } catch { return {} }
}

export function getNoteForEvent(eventId: string): Note {
  return getNotes()[eventId] || { text: '', images: [], audioUrl: '', updatedAt: '' }
}

export function saveNote(eventId: string, note: Partial<Note>): void {
  const all = getNotes()
  all[eventId] = { ...getNoteForEvent(eventId), ...note, updatedAt: new Date().toISOString() }
  localStorage.setItem(KEYS.NOTES, JSON.stringify(all))
}

export function getProfile(): Profile {
  const defaults: Profile = { name: '', role: '', accent: '#7c5cfc', badgePhoto: '' }
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEYS.PROFILE) || '{}') }
  } catch { return defaults }
}

export function saveProfile(p: Partial<Profile>): void {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify({ ...getProfile(), ...p }))
}
