import { useEffect, useRef } from 'react'
import styles from './WaveVisualizer.module.css'

type Props = { playing: boolean }

/**
 * The "host" visual for 1111.fm — a flowing white waveform.
 * Currently driven by a synthetic spectrum; swap `level()` for a real
 * Web Audio AnalyserNode later to react to the actual stream.
 */
export default function WaveVisualizer({ playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playingRef = useRef(playing)
  playingRef.current = playing

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let cw = 0
    let ch = 0
    const resize = () => {
      cw = window.innerWidth
      ch = window.innerHeight
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // --- synthetic spectrum: layered sines + a drifting beat kick ---
    const NB = 5
    const bands = Array.from({ length: NB }, (_, i) => ({
      phase: i * 0.9,
      freq: 0.8 + i * 0.35,
      cur: 0.4,
    }))
    const level = (i: number, t: number) => {
      const s = bands[i]
      let v = 0.5 + 0.5 * Math.sin(t * (1.4 + s.freq) + s.phase) * (0.6 + 0.4 * Math.sin(t * 0.7 + i))
      v += 0.15 * Math.sin(t * (4.0 + i) + s.phase * 2)
      const beat = Math.pow(Math.max(0, Math.sin(t * 2.0 - i * 0.4)), 8)
      return Math.min(1.1, Math.max(0.08, v * 0.8 + beat * 0.4))
    }

    const drawWave = (
      t: number,
      amp: number,
      speed: number,
      width: number,
      alpha: number,
      fill: boolean,
    ) => {
      const midY = ch / 2
      const pts: Array<[number, number]> = []
      for (let x = 0; x <= cw; x += 4) {
        const nx = x / cw
        const y =
          Math.sin(nx * 8 + t * 2.0 * speed) * 0.5 +
          Math.sin(nx * 17 - t * 3.0 * speed) * 0.3 +
          Math.sin(nx * 29 + t * 1.5 * speed) * 0.2
        const env = Math.sin(nx * Math.PI) // taper toward the edges
        pts.push([x, midY + y * amp * env])
      }

      if (fill) {
        const grad = ctx.createLinearGradient(0, midY - amp, 0, midY + amp)
        grad.addColorStop(0, `rgba(255,255,255,${0.22 * alpha})`)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.beginPath()
        ctx.moveTo(0, midY)
        pts.forEach((p) => ctx.lineTo(p[0], p[1]))
        ctx.lineTo(cw, midY)
        ctx.fillStyle = grad
        ctx.fill()
      }

      ctx.beginPath()
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
      ctx.lineWidth = width
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`
      ctx.shadowColor = 'rgba(255,255,255,0.8)'
      ctx.shadowBlur = fill ? 24 : 0
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    let t = 0
    let active = 1 // 1 = playing, ramps to 0 when paused so the wave dies down to flat
    let last = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt // phase keeps moving; amplitude (via `active`) handles pause

      // ease the whole wave toward flat when paused, back to life when playing
      active += ((playingRef.current ? 1 : 0) - active) * 0.05

      let sum = 0
      for (let i = 0; i < NB; i++) {
        const target = playingRef.current ? level(i, t) : 0
        bands[i].cur += (target - bands[i].cur) * 0.14
        sum += bands[i].cur
      }
      const energy = sum / NB

      ctx.clearRect(0, 0, cw, ch)
      const base = ch * 0.17
      // faint slower wave behind for depth
      drawWave(t * 0.7, base * (0.5 + energy * 0.8) * active, 0.6, 2, 0.28, false)
      // bright hero wave in front (flattens to a calm glowing line when paused)
      drawWave(t, base * (0.35 + energy) * active, 1.0, 4, 1, true)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} />
}
