import type { RadioDisplay } from '../useRadio'
import styles from './NowPlaying.module.css'

export default function NowPlaying({ display }: { display: RadioDisplay }) {
  // `key` on each line re-triggers the fade animation whenever the text changes
  return (
    <div className={styles.center}>
      <div className={styles.kicker} key={display.kicker}>{display.kicker}</div>
      <div className={styles.title} key={display.title}>{display.title}</div>
      <div className={styles.sub} key={display.sub}>{display.sub}</div>
    </div>
  )
}
