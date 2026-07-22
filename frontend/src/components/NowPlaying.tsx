import type { RadioDisplay } from '../useRadio'
import styles from './NowPlaying.module.css'

export default function NowPlaying({ display }: { display: RadioDisplay }) {
  return (
    <div className={styles.center}>
      <div className={styles.kicker}>{display.kicker}</div>
      <div className={styles.title}>{display.title}</div>
      <div className={styles.sub}>{display.sub}</div>
    </div>
  )
}
