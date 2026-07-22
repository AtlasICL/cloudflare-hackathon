import { useEffect, useRef, useState } from 'react'
import type { Settings } from './settings'

type SegmentType = 'intro' | 'commute' | 'interview'
type Segment = { script: string; title: string; audio: Blob }

export type RadioDisplay = {
  kicker: string
  title: string
  sub: string
  metaTitle: string
  metaSub: string
}

export type RadioToast = { title: string; body: string } | null

const SONG_DISPLAY: RadioDisplay = {
  kicker: 'Now streaming',
  title: 'Everybody Loves the Sunshine',
  sub: 'Roy Ayers Ubiquity · tuned to your commute',
  metaTitle: 'Everybody Loves the Sunshine',
  metaSub: 'Roy Ayers Ubiquity',
}

export function useRadio(settings: Settings) {
  // keep the latest listener profile available to segment requests without
  // re-running the whole engine when settings change
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const [music] = useState(() => new Audio('/api/song'))
  const [voice] = useState(() => new Audio())
  const [playing, setPlaying] = useState(false)
  const [display, setDisplay] = useState<RadioDisplay>({
    ...SONG_DISPLAY,
    kicker: 'Up first',
    sub: 'Roy Ayers Ubiquity · official preview',
  })
  const [toast, setToast] = useState<RadioToast>(null)

  const playingRef = useRef(false)
  const phase = useRef<'idle' | 'intro' | 'music' | 'voice' | 'ended'>('idle')
  const started = useRef(false)
  const introPlayed = useRef(false)
  const updateIndex = useRef(0)
  const updateTimer = useRef(0)
  const generation = useRef(0)
  const voiceUrl = useRef('')
  const fadeFrame = useRef(0)
  const finishFade = useRef<(() => void) | null>(null)
  const segments = useRef(new Map<SegmentType, Promise<Segment>>())
  const voiceDone = useRef<() => void>(() => {})

  function setPlayback(value: boolean) {
    playingRef.current = value
    setPlaying(value)
  }

  function clearTimer() {
    window.clearTimeout(updateTimer.current)
    updateTimer.current = 0
  }

  function cancelFade() {
    cancelAnimationFrame(fadeFrame.current)
    fadeFrame.current = 0
    finishFade.current?.()
    finishFade.current = null
  }

  function fadeMusic(target: number, duration = 900) {
    cancelFade()
    const from = music.volume
    const startedAt = performance.now()
    return new Promise<void>((resolve) => {
      finishFade.current = resolve
      const frame = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration)
        music.volume = from + (target - from) * progress * (2 - progress)
        if (progress < 1) fadeFrame.current = requestAnimationFrame(frame)
        else {
          fadeFrame.current = 0
          finishFade.current = null
          resolve()
        }
      }
      fadeFrame.current = requestAnimationFrame(frame)
    })
  }

  function getSegment(type: SegmentType) {
    const cached = segments.current.get(type)
    if (cached) return cached
    const s = settingsRef.current
    const request = fetch('/api/generate-segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // listener profile lets the Worker personalize the DJ script;
      // the backend currently ignores unknown fields, so this is non-breaking
      body: JSON.stringify({
        type,
        listener: {
          id: s.id,
          name: s.name,
          location: s.location,
          topics: s.topics,
          taste: s.taste,
        },
      }),
    }).then(async (response) => {
      if (!response.ok) throw new Error('The AI host is unavailable.')
      return {
        script: decodeURIComponent(response.headers.get('X-DJ-Script') || ''),
        title: decodeURIComponent(response.headers.get('X-DJ-Title') || '1111.fm update'),
        audio: await response.blob(),
      }
    })
    segments.current.set(type, request)
    request.catch(() => segments.current.delete(type))
    return request
  }

  function releaseVoice() {
    voice.onended = null
    voice.onerror = null
    voice.pause()
    voice.removeAttribute('src')
    voice.load()
    if (voiceUrl.current) URL.revokeObjectURL(voiceUrl.current)
    voiceUrl.current = ''
  }

  async function playVoice(segment: Segment, onDone: () => void, nextPhase: 'intro' | 'voice') {
    voiceDone.current = onDone
    voiceUrl.current = URL.createObjectURL(segment.audio)
    voice.src = voiceUrl.current
    voice.onended = onDone
    voice.onerror = onDone
    phase.current = nextPhase
    await voice.play()
    setPlayback(true)
  }

  function scheduleUpdate() {
    clearTimer()
    const delays = [7000, 6500]
    if (phase.current !== 'music' || updateIndex.current >= delays.length) return
    updateTimer.current = window.setTimeout(() => void playUpdate(), delays[updateIndex.current])
  }

  async function resumeMusic(fadeIn = false) {
    phase.current = 'music'
    setDisplay(SONG_DISPLAY)
    setToast(null)
    if (fadeIn) music.volume = 0
    await music.play()
    setPlayback(true)
    if (fadeIn) await fadeMusic(1, 1100)
    scheduleUpdate()
  }

  function finishIntro() {
    releaseVoice()
    introPlayed.current = true
    void resumeMusic(true)
  }

  function finishUpdate() {
    releaseVoice()
    updateIndex.current += 1
    void resumeMusic(true)
  }

  async function playIntro() {
    const requestId = ++generation.current
    phase.current = 'intro'
    setPlayback(true)
    const name = settingsRef.current.name.trim()
    setDisplay({
      kicker: name ? `Good morning, ${name}` : 'Your AI host',
      title: '1111.fm Morning Show',
      sub: 'Warming up the microphone',
      metaTitle: '1111.fm Live',
      metaSub: 'AI DJ · introducing your first song',
    })
    try {
      const segment = await getSegment('intro')
      if (requestId !== generation.current || !playingRef.current) return
      setToast({ title: segment.title, body: segment.script })
      setDisplay((current) => ({ ...current, title: segment.title, sub: 'AI DJ · on air' }))
      await playVoice(segment, finishIntro, 'intro')
    } catch {
      releaseVoice()
      introPlayed.current = true
      await resumeMusic(true)
    }
  }

  async function playUpdate() {
    clearTimer()
    if (!playingRef.current || phase.current !== 'music' || updateIndex.current >= 2) return
    const requestId = ++generation.current
    const type: SegmentType = updateIndex.current === 0 ? 'commute' : 'interview'
    setDisplay((current) => ({ ...current, metaSub: 'AI DJ · preparing live update' }))
    try {
      const segment = await getSegment(type)
      if (requestId !== generation.current || !playingRef.current || phase.current !== 'music') return
      await fadeMusic(0)
      if (requestId !== generation.current || !playingRef.current) return
      music.pause()
      setToast({ title: segment.title, body: segment.script })
      setDisplay({
        kicker: 'AI DJ interruption',
        title: segment.title,
        sub: 'Personal update · just for you',
        metaTitle: '1111.fm Live',
        metaSub: 'AI DJ · speaking now',
      })
      await playVoice(segment, finishUpdate, 'voice')
    } catch {
      if (music.paused) {
        releaseVoice()
        updateIndex.current += 1
        await resumeMusic(true)
      } else {
        scheduleUpdate()
      }
    }
  }

  async function start(reset = false) {
    if (reset || phase.current === 'ended') {
      generation.current += 1
      updateIndex.current = 0
      introPlayed.current = false
      music.currentTime = 0
    }
    started.current = true
    if (introPlayed.current) await resumeMusic()
    else await playIntro()
  }

  function pause() {
    clearTimer()
    cancelFade()
    generation.current += 1
    if (phase.current === 'music') music.pause()
    else voice.pause()
    setPlayback(false)
  }

  async function toggle() {
    if (!started.current) await start()
    else if (playingRef.current) pause()
    else if (phase.current === 'music') await resumeMusic()
    else {
      await voice.play()
      setPlayback(true)
    }
  }

  async function previous() {
    clearTimer()
    music.pause()
    music.volume = 1
    releaseVoice()
    await start(true)
  }

  async function next() {
    if (!started.current) await start()
    else if (phase.current === 'music') await playUpdate()
    else voiceDone.current()
  }

  useEffect(() => {
    music.preload = 'auto'
    voice.preload = 'auto'
    void getSegment('intro')
    music.onended = () => {
      clearTimer()
      phase.current = 'ended'
      setPlayback(false)
      setDisplay((current) => ({
        ...current,
        kicker: 'Mix complete',
        sub: 'Press play to hear your personal station again',
        metaSub: '1111.fm · ready to replay',
      }))
    }
    return () => {
      clearTimer()
      cancelFade()
      music.pause()
      releaseVoice()
    }
  }, [music, voice])

  // persist the listener profile to D1 whenever settings change (best-effort)
  useEffect(() => {
    void fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: settings.id,
        name: settings.name,
        location: settings.location,
        topics: settings.topics,
        taste: settings.taste,
      }),
    }).catch(() => {})
  }, [settings])

  return { display, next, playing, previous, toast, toggle }
}
