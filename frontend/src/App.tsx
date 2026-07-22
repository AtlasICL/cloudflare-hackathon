import { useState } from 'react'
import WaveVisualizer from './components/WaveVisualizer'
import TopBar from './components/TopBar'
import NowPlaying from './components/NowPlaying'
import AgentToast from './components/AgentToast'
import Player from './components/Player'
import SettingsPanel from './components/Settings'
import { useSettings } from './useSettings'
import styles from './App.module.css'

export default function App() {
  const [playing, setPlaying] = useState(true)
  const [settings, setSettings] = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className={styles.stage}>
      <div className={styles.glow} />
      <WaveVisualizer playing={playing} />
      <div className={styles.vignette} />

      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
      <NowPlaying settings={settings} />
      <AgentToast settings={settings} />
      <Player playing={playing} onToggle={() => setPlaying((p) => !p)} />

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
