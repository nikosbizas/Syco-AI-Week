export interface Speaker {
  name: string
  role: string
  company: string
}

export type CategoryId =
  | 'ai-play-stage'
  | 'agentic-ai'
  | 'featured'
  | 'robotics'
  | 'podcast-tv-stage'

export interface Event {
  id: string
  title: string
  speakers: Speaker[]
  date: string       // "2026-05-19"
  startTime: string  // "11:30"
  endTime: string    // "12:00"
  stage: string
  categories: CategoryId[]
  tags: string[]
  description?: string
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
