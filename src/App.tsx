import { useEffect, useState } from 'react'
import Calendar from './components/Calendar'
import ChatPanel from './components/ChatPanel'
import TodayTasks from './components/TodayTasks'
import LoginPage, { MobileLoginPage } from './components/LoginPage'
import MobileApp from './components/MobileApp'
import { useTaskStore } from './store/taskStore'
import { supabase } from './services/supabase'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function App() {
  const { fetchTasks } = useTaskStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [session, setSession] = useState<boolean | null>(null)
  const isMobile = useIsMobile()

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
        <style>{`@keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }`}</style>
      </div>
    )
  }

  if (!session) {
    return isMobile
      ? <MobileLoginPage onLogin={() => setSession(true)} />
      : <LoginPage onLogin={() => setSession(true)} />
  }

  // Mobile layout — bottom tabs
  if (isMobile) {
    return <MobileApp selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
  }

  // Desktop layout — 3-column grid
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--panel)',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: '300px 1fr 320px',
    }}>
      <ChatPanel />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: '1px solid var(--border-soft)', borderRight: '1px solid var(--border-soft)' }}>
        <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>
      <TodayTasks selectedDate={selectedDate} />
    </div>
  )
}
