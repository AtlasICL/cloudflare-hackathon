import { useState } from 'react'
import WaveVisualizer from './components/WaveVisualizer'
import TopBar from './components/TopBar'
import NowPlaying from './components/NowPlaying'
import AgentToast from './components/AgentToast'
import Player from './components/Player'
import AskBar from './components/AskBar'
import SettingsPanel from './components/Settings'
import { useSettings } from './useSettings'
import { useRadio } from './useRadio'
import styles from './App.module.css'

export default function App() {
  const [settings, setSettings] = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const radio = useRadio(settings)

  return (
    <div className={styles.stage}>
      <div className={styles.glow} />
      <WaveVisualizer playing={radio.playing} />
      <div className={styles.vignette} />

      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
      <NowPlaying display={radio.display} />
      <AgentToast update={radio.toast} />
      <AskBar onAsk={(q) => void radio.ask(q)} />
      <Player
        display={radio.display}
        playing={radio.playing}
        onNext={() => void radio.next()}
        onPrevious={() => void radio.previous()}
        onToggle={() => void radio.toggle()}
      />

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
