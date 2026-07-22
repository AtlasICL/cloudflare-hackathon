import type { RadioToast } from '../useRadio'
import styles from './AgentToast.module.css'

export default function AgentToast({ update }: { update: RadioToast }) {
  return (
    <div className={`${styles.agent} ${update ? styles.show : ''}`}>
      <div className={styles.txt}>
        <b>{update?.title}</b>
        <p>{update?.body}</p>
      </div>
    </div>
  )
}
