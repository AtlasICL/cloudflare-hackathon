import { tasteLabel, type Settings } from '../settings'
import styles from './NowPlaying.module.css'

export default function NowPlaying({ settings }: { settings: Settings }) {
  const taste = tasteLabel(settings.taste)
  const kicker = settings.name ? `Streaming for ${settings.name}` : 'Now streaming'
  const sub = settings.location ? `Curated for ${settings.location}` : 'Curated for your day'

  return (
    <div className={styles.center}>
      <div className={styles.kicker}>{kicker}</div>
      <div className={styles.title}>{taste} — tuned to you</div>
      <div className={styles.sub}>{sub}</div>
    </div>
  )
}
