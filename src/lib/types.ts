export interface Speaker {
  id?: string
  name: string
  role: string
  company: string
  photo?: string
}

export type CategoryId =
  | 'ai-play-stage'
  | 'agentic-ai'
  | 'featured'
  | 'robotics'
  | 'podcast-tv-stage'
  | 'standup'
  | 'startup'
  | 'meetup'
  | 'regulation'
  | 'healthcare'
  | 'ai-sport'
  | 'charity'
  | 'general'

export interface Event {
  id: string
  title: string
  description?: string
  speakers: Speaker[]
  date: string       // "2026-05-19"
  startTime: string  // "11:30"
  endTime: string    // "12:00"
  stage: string
  categories: CategoryId[]
  day: number
}

export interface Note {
  text: string
  images: string[]  // base64 dataURLs
  audioUrl: string  // base64 dataURL
  updatedAt: string
}

export interface Profile {
  name: string
  role: 'social-content' | 'creative-design' | 'development' | 'account' | ''
  accent: string
  badgePhoto: string
  theme: 'dark' | 'light'
}

export type MyEvents = string[]
