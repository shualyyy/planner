import { useEffect, useState, Component, type ReactNode } from 'react'
import LoginPage, { MobileLoginPage } from './components/LoginPage'
import MobileApp from './components/MobileApp'
import { useTaskStore } from './store/taskStore'
import { supabase } from './services/supabase'
import { useIsMobile } from './hooks/useIsMobile'

/* ── Error Boundary ── */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          width: '100vw', height: '100vh', background: 'var(--bg)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ font: '600 16px/1.4 var(--font-sans)', color: 'var(--text)' }}>Something went wrong</div>
          <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--text-muted)', maxWidth: 280 }}>
            {(this.state.error as Error).message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 999, border: 'none',
              background: 'var(--accent)', color: '#fff',
              font: '600 13px/1 var(--font-sans)', cursor: 'pointer',
            }}
          >Reload app</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const { fetchTasks, fetchProjects, fetchHabits, theme } = useTaskStore()
  const [session, setSession] = useState<boolean | null>(null)
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
    if (session) { fetchTasks(); fetchProjects(); fetchHabits() }
  }, [session, fetchTasks, fetchProjects, fetchHabits])

  // Loading
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

  return (
    <ErrorBoundary>
      <MobileApp />
    </ErrorBoundary>
  )
}
