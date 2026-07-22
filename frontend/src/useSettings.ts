import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type Settings } from './settings'

const KEY = '1111fm.settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
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
