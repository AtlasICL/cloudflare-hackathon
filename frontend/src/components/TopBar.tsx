import styles from './TopBar.module.css'

type Props = { onOpenSettings: () => void }

export default function TopBar({ onOpenSettings }: Props) {
  return (
    <header className={styles.top}>
      <button className={styles.brand} onClick={onOpenSettings} aria-label="Open settings">
        <span className={styles.dot}>1111</span>
        <span className={styles.text}>
          <span className={styles.name}>1111.fm</span>
          <span className={styles.sub}>your personal AI radio</span>
        </span>
        <span className={styles.gear} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M19.4 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1l-.4-2.5H9.1l-.4 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4L2.6 11a7.7 7.7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.8 1.7 1l.4 2.5h5.8l.4-2.5c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <div className={styles.live}>
        <span className={styles.pulse} /> ON AIR · 1111.fm
      </div>
    </header>
  )
}
