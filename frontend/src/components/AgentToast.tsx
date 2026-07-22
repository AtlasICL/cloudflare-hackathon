import { useEffect, useMemo, useRef, useState } from 'react'
import type { Settings } from '../settings'
import styles from './AgentToast.module.css'

type Update = { icon: string; head: string; body: string }

// Demo of the AI agent "breaking in" over the music, filtered to the
// user's chosen topics. Later: feed these from a Worker (Workers AI + data sources).
function buildUpdates(settings: Settings): Update[] {
  const loc = settings.location || 'your area'
  const byTopic: Record<string, Update> = {
    f1: { icon: '🏎️', head: 'Live update · F1', body: 'Verstappen just took pole in Monaco qualifying — 0.2s ahead of Leclerc.' },
    world: { icon: '🌍', head: 'World events', body: 'Breaking: markets rally as the ECB holds rates steady this morning.' },
    traffic: { icon: '🚦', head: `Traffic · ${loc}`, body: `Heads up: main routes into ${loc} are backed up. +12 min on your usual commute.` },
    weather: { icon: '⛅', head: `Weather · ${loc}`, body: 'Rain clearing by noon — 21°C and sunny for your afternoon.' },
    markets: { icon: '📈', head: 'Markets', body: 'Tech stocks up 1.8% at the open; your watchlist is green.' },
    tech: { icon: '💻', head: 'Tech', body: 'Cloudflare just shipped a new AI gateway — developers are buzzing.' },
    sports: { icon: '⚽', head: 'Sports', body: 'Late winner in the derby — 2–1 in stoppage time.' },
  }
  const list = settings.topics.map((id) => byTopic[id]).filter(Boolean)
  return list.length ? list : Object.values(byTopic)
}

export default function AgentToast({ settings }: { settings: Settings }) {
  const updates = useMemo(() => buildUpdates(settings), [settings])
  const updatesRef = useRef(updates)
  updatesRef.current = updates

  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>
    const reveal = () => {
      setShow(true)
      hideTimer = setTimeout(() => setShow(false), 5200)
    }
    const first = setTimeout(reveal, 1800)
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % updatesRef.current.length)
      reveal()
    }, 9000)
    return () => {
      clearTimeout(first)
      clearTimeout(hideTimer)
      clearInterval(interval)
    }
  }, [])

  const item = updates[idx % updates.length] ?? updates[0]

  return (
    <div className={`${styles.agent} ${show ? styles.show : ''}`}>
      <div className={styles.badge}>{item.icon}</div>
      <div className={styles.txt}>
        <b>{item.head}</b>
        <p>{item.body}</p>
      </div>
    </div>
  )
}
