import { useEffect, useState } from 'react'
import Calendar from './components/Calendar'
import ChatPanel from './components/ChatPanel'
import TodayTasks from './components/TodayTasks'
import LoginPage from './components/LoginPage'
import { useTaskStore } from './store/taskStore'
import { supabase } from './services/supabase'

export default function App() {
  const { fetchTasks } = useTaskStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [session, setSession] = useState<boolean | null>(null) // null = loading

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(!!sess)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) fetchTasks()
  }, [session, fetchTasks])

  // Still checking session
  if (session === null) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 12px var(--accent-glow)', animation: 'ping 1s ease-in-out infinite' }} />
        <style>{`@keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }`}</style>
      </div>
    )
  }

  if (!session) {
    return <LoginPage onLogin={() => setSession(true)} />
  }

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
      <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <TodayTasks selectedDate={selectedDate} />
    </div>
  )
}
