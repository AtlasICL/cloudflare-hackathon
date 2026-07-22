import styles from './Player.module.css'
import type { RadioDisplay } from '../useRadio'

type Props = {
  display: RadioDisplay
  playing: boolean
  onNext: () => void
  onPrevious: () => void
  onToggle: () => void
}

export default function Player({ display, playing, onNext, onPrevious, onToggle }: Props) {
  return (
    <div className={styles.player}>
      <button className={styles.sm} aria-label="previous" onClick={onPrevious}>
        <svg viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
        </svg>
      </button>

      <button className={styles.play} aria-label="play/pause" onClick={onToggle}>
        <svg viewBox="0 0 24 24">
          {playing ? (
            <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
          ) : (
            <path d="M8 5v14l11-7z" />
          )}
        </svg>
      </button>

      <button className={styles.sm} aria-label="next" onClick={onNext}>
        <svg viewBox="0 0 24 24">
          <path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z" />
        </svg>
      </button>

      <div className={styles.meta}>
        <b>{display.metaTitle}</b>
        <span>{display.metaSub}</span>
      </div>
    </div>
  )
}
