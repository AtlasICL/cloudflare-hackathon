import { useRef, useState } from 'react'
import styles from './AskBar.module.css'

export default function AskBar({ onAsk }: { onAsk: (q: string) => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function expand() {
    setOpen(true)
    // focus after the width transition kicks in
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) {
      setOpen(false)
      return
    }
    onAsk(q)
    setValue('')
    setOpen(false)
  }

  return (
    <form className={`${styles.bar} ${open ? styles.open : ''}`} onSubmit={submit}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => (open ? submit(new Event('submit') as unknown as React.FormEvent) : expand())}
        aria-label="Ask the DJ"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <input
        ref={inputRef}
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => !value && setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && (setOpen(false), setValue(''))}
        placeholder="Ask the DJ anything…"
        aria-label="Ask the DJ a question"
      />

      {open && value.trim() && (
        <button type="submit" className={styles.send} aria-label="Send">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12h13m0 0-5-5m5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {!open && <span className={styles.label}>Ask the DJ</span>}
    </form>
  )
}
