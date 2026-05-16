import { useEffect, useState } from 'react'
import Calendar from './components/Calendar'
import ChatPanel from './components/ChatPanel'
import TodayTasks from './components/TodayTasks'
import LoginPage, { MobileLoginPage } from './components/LoginPage'
import MobileApp from './components/MobileApp'
import SettingsModal from './components/SettingsModal'
import { useTaskStore } from './store/taskStore'
import { supabase } from './services/supabase'
import { useIsMobile } from './hooks/useIsMobile'
import { GearIcon } from './components/icons'

export default function App() {
  const { fetchTasks, theme } = useTaskStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [session, setSession] = useState<boolean | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isMobile = useIsMobile()

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(!!sess)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) fetchTasks()
  }, [session, fetchTasks])

  // Loading spinner
  if (session === null) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 12px var(--accent-glow)', animation: 'ping 1s ease-in-out infinite' }} />
      </div>
    )
  }

  if (!session) {
    return isMobile
      ? <MobileLoginPage onLogin={() => setSession(true)} />
      : <LoginPage onLogin={() => setSession(true)} />
  }

  // Mobile layout — 5-tab floating pill
  if (isMobile) {
    return <MobileApp />
  }

  // Desktop layout — 3-column grid
  return (
    <>
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--surface)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '300px 1fr 320px',
      }}>
        <ChatPanel />
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
          <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </div>
        <TodayTasks selectedDate={selectedDate} />
      </div>

      {/* Settings button — desktop */}
      <button
        onClick={() => setSettingsOpen(true)}
        title="Settings"
        style={{
          position: 'fixed', top: '14px', right: '16px', zIndex: 50,
          width: '32px', height: '32px', borderRadius: '9px',
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
        }}
      >
        <GearIcon size={16} />
      </button>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
