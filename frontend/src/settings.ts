export type Settings = {
  name: string
  location: string
  topics: string[] // topic ids
  taste: string // music taste / mood id
}

export const TOPIC_OPTIONS = [
  { id: 'f1', icon: '🏎️', label: 'Formula 1' },
  { id: 'world', icon: '🌍', label: 'World events' },
  { id: 'traffic', icon: '🚦', label: 'Traffic' },
  { id: 'weather', icon: '⛅', label: 'Weather' },
  { id: 'markets', icon: '📈', label: 'Markets' },
  { id: 'tech', icon: '💻', label: 'Tech' },
  { id: 'sports', icon: '⚽', label: 'Sports' },
] as const

export const TASTE_OPTIONS = [
  { id: 'deep-house', label: 'Deep house' },
  { id: 'lofi', label: 'Lo-fi beats' },
  { id: 'pop', label: 'Pop hits' },
  { id: 'jazz', label: 'Jazz & soul' },
  { id: 'focus', label: 'Focus flow' },
  { id: 'rock', label: 'Rock' },
] as const

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  location: 'Berlin',
  topics: ['f1', 'world', 'traffic'],
  taste: 'deep-house',
}

export const tasteLabel = (id: string) =>
  TASTE_OPTIONS.find((t) => t.id === id)?.label ?? 'Your mix'
