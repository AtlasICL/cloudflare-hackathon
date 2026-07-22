import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type Settings } from './settings'

const KEY = '1111fm.settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    let loaded: Settings = DEFAULT_SETTINGS
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      /* ignore */
    }
    // mint a stable listener id on first run (used as the D1 primary key)
    if (!loaded.id) loaded = { ...loaded, id: crypto.randomUUID() }
    return loaded
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  }, [settings])

  return [settings, setSettings] as const
}
