import { TASTE_OPTIONS, TOPIC_OPTIONS, type Settings } from '../settings'
import styles from './Settings.module.css'

type Props = {
  settings: Settings
  onChange: (s: Settings) => void
  onClose: () => void
}

export default function SettingsPanel({ settings, onChange, onClose }: Props) {
  const toggleTopic = (id: string) => {
    const has = settings.topics.includes(id)
    onChange({
      ...settings,
      topics: has ? settings.topics.filter((t) => t !== id) : [...settings.topics, id],
    })
  }

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Station settings">
        <header className={styles.head}>
          <div>
            <h2>Your station</h2>
            <p>Tune 1111.fm to you.</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </header>

        <label className={styles.field}>
          <span>Name</span>
          <input
            type="text"
            placeholder="What should the DJ call you?"
            value={settings.name}
            onChange={(e) => onChange({ ...settings, name: e.target.value })}
          />
        </label>

        <label className={styles.field}>
          <span>Location</span>
          <input
            type="text"
            placeholder="City for traffic & weather"
            value={settings.location}
            onChange={(e) => onChange({ ...settings, location: e.target.value })}
          />
        </label>

        <div className={styles.field}>
          <span>Topics to break in with</span>
          <div className={styles.chips}>
            {TOPIC_OPTIONS.map((t) => {
              const active = settings.topics.includes(t.id)
              return (
                <button
                  key={t.id}
                  className={`${styles.chip} ${active ? styles.active : ''}`}
                  onClick={() => toggleTopic(t.id)}
                  aria-pressed={active}
                >
                  {t.icon} {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.field}>
          <span>Music taste &amp; mood</span>
          <div className={styles.chips}>
            {TASTE_OPTIONS.map((t) => {
              const active = settings.taste === t.id
              return (
                <button
                  key={t.id}
                  className={`${styles.chip} ${active ? styles.active : ''}`}
                  onClick={() => onChange({ ...settings, taste: t.id })}
                  aria-pressed={active}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <button className={styles.done} onClick={onClose}>Start listening</button>
      </div>
    </div>
  )
}
