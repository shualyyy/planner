import { useState } from 'react'
import { supabase } from '../services/supabase'

// ─── Icons ────────────────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 7l9 6 9-6" />
  </svg>
)
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
)
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
)
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.4 5.6A10.5 10.5 0 0112 5c6.5 0 10 7 10 7a17.6 17.6 0 01-3.4 4.5M6.6 6.6A17.7 17.7 0 002 12s3.5 7 10 7a10.5 10.5 0 005.4-1.5" />
  </svg>
)
const CheckIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
  </svg>
)
const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
)
const BoltIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
)
const Lock2Icon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
)
const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 010-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1024 44a20 20 0 0019.6-23.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0124 16c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 006.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44a20 20 0 0013.5-5.2l-6.2-5.3A12 12 0 0112.7 28l-6.5 5A20 20 0 0024 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 01-4.1 5.5l6.2 5.3c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/>
  </svg>
)

// ─── Mini Calendar Preview ────────────────────────────────────────────────────
function MiniCalendar() {
  const weekdays = ['M','T','W','T','F','S','S']
  const cells = Array.from({ length: 35 }, (_, i) => {
    if (i < 4) return { display: 27 + i, isIn: false, isToday: false, hasTask: false }
    const d = i - 3
    const isIn = d <= 31
    const display = isIn ? d : d - 31
    return {
      display,
      isIn,
      isToday: isIn && display === 10,
      hasTask: isIn && [3,7,12,15,18,21,23,27].includes(display),
    }
  })

  return (
    <div style={{
      background: 'rgba(20,20,20,0.7)', backdropFilter: 'blur(12px)',
      border: '1px solid var(--border)', borderRadius: '14px',
      padding: '16px 18px', width: '300px', alignSelf: 'flex-end',
      boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 550, color: 'var(--text)' }}>May 2026</div>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-2)', boxShadow: '0 0 8px rgba(217,119,87,0.6)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
        {weekdays.map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((c, i) => (
          <div key={i} style={{
            aspectRatio: '1', borderRadius: '5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontVariantNumeric: 'tabular-nums',
            position: 'relative',
            color: c.isToday ? '#fff' : c.isIn ? 'var(--text-2)' : 'var(--text-muted)',
            fontWeight: c.isToday ? 600 : 400,
            background: c.isToday ? 'linear-gradient(180deg, rgba(217,119,87,0.22), rgba(217,119,87,0.08))' : 'transparent',
            border: c.isToday ? '1px solid rgba(217,119,87,0.55)' : '1px solid transparent',
          }}>
            {c.display}
            {c.hasTask && !c.isToday && (
              <span style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '3px', height: '3px', borderRadius: '50%', background: 'var(--accent-2)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Mobile Login ─────────────────────────────────────────────────────────────
export function MobileLoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      onLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      padding: '0 24px',
      paddingBottom: 'env(safe-area-inset-bottom, 16px)',
    }}>
      {/* Glow */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '280px', background: 'radial-gradient(circle at 50% 0%, rgba(217,119,87,0.18), transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Brand */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '52px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '18px',
            background: 'linear-gradient(135deg, var(--accent), #b85a3d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 0 0 1px rgba(217,119,87,0.4), 0 14px 36px rgba(217,119,87,0.4)',
          }}>
            <SparkleIcon />
          </div>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.022em', margin: '0 0 8px', color: 'var(--text)' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            {mode === 'signin' ? 'Sign in to pick up where you left off.' : 'Start planning smarter today.'}
          </p>
        </div>

        {/* SSO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '28px' }}>
          <button onClick={handleGoogle} style={mobileSSOBtn}><GoogleIcon /> Google</button>
          <button onClick={() => {}} style={mobileSSOBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.4 1.5c0 1.2-.5 2.4-1.3 3.3-.9.9-2.2 1.6-3.4 1.5-.1-1.2.5-2.4 1.3-3.2.9-.9 2.3-1.6 3.4-1.6zm4 16.6c-.6 1.4-1 2-1.7 3.2-1 1.7-2.5 3.7-4.3 3.7-1.6 0-2.1-1.1-4.3-1-2.2 0-2.7 1-4.4 1-1.8 0-3.2-1.9-4.2-3.5C-1 17.6-1.5 11 1.6 7.4c1.6-1.7 3.7-2.7 5.6-2.7 1.9 0 3.1 1 4.7 1 1.5 0 2.4-1 4.6-1 1.7 0 3.5.9 4.7 2.5-4.2 2.3-3.5 8.3.2 9.9z"/>
            </svg>
            Apple
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 16px', color: 'var(--text-faint)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-soft)' }} />
          or email
          <div style={{ flex: 1, height: '1px', background: 'var(--border-soft)' }} />
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', fontSize: '12.5px', padding: '9px 12px', borderRadius: '10px', display: 'flex', gap: '8px' }}>
              ⚠ {error}
            </div>
          )}

          {/* Email */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '7px', fontWeight: 500 }}>Email</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}><MailIcon /></span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={mobileInput} />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>Password</span>
              {mode === 'signin' && <span style={{ fontSize: '11.5px', color: 'var(--accent-2)', cursor: 'pointer' }}>Forgot?</span>}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}><LockIcon /></span>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} style={{ ...mobileInput, paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '30px', height: '30px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '7px' }}>
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            marginTop: '6px', height: '50px', borderRadius: '13px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontFamily: 'inherit',
            fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 20px rgba(217,119,87,0.35)',
            WebkitTapHighlightColor: 'transparent',
          }}>
            {loading
              ? <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : <>{mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowIcon /></>
            }
          </button>
        </form>

        <div style={{ marginTop: 'auto', textAlign: 'center', paddingTop: '24px', paddingBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
          {mode === 'signin' ? 'New here?' : 'Already have an account?'}
          {' '}
          <span onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }} style={{ color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>
            {mode === 'signin' ? 'Create account' : 'Sign in'}
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const mobileSSOBtn: React.CSSProperties = {
  height: '46px', borderRadius: '12px', background: '#1a1a1a',
  border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'inherit',
  fontSize: '13.5px', fontWeight: 500, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  WebkitTapHighlightColor: 'transparent',
}

const mobileInput: React.CSSProperties = {
  width: '100%', height: '48px', borderRadius: '12px', background: '#1a1a1a',
  border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'inherit',
  fontSize: '15px', padding: '0 14px 0 40px', outline: 'none', boxSizing: 'border-box',
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      onLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '1100px', height: '720px',
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 80px rgba(0,0,0,0.5)',
      }}>

        {/* ─── Left: brand ─── */}
        <div style={{
          position: 'relative',
          padding: '36px 44px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          borderRight: '1px solid var(--border-soft)',
          background: 'radial-gradient(1100px 600px at -10% 110%, rgba(217,119,87,0.12), transparent 60%), radial-gradient(800px 400px at 110% -10%, rgba(217,119,87,0.05), transparent 60%), linear-gradient(180deg, #131313 0%, #101010 100%)',
          overflow: 'hidden',
        }}>
          {/* Grid background */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 100%)',
          }} />

          {/* Logo */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '11px', zIndex: 1 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'linear-gradient(135deg, var(--accent), #b85a3d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 0 0 1px rgba(217,119,87,0.3), 0 8px 24px rgba(217,119,87,0.25)',
            }}>
              <SparkleIcon />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text)' }}>
              Planner<span style={{ color: 'var(--accent-2)' }}>.</span>
            </div>
          </div>

          {/* Pitch */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '420px' }}>
            <h1 style={{ fontSize: '38px', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.025em', margin: '0 0 18px', color: 'var(--text)' }}>
              Your day,<br />
              <span style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>
                planned by AI.
              </span>
            </h1>
            <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-2)', margin: '0 0 28px' }}>
              A calendar that thinks ahead. Chat with an assistant that understands your schedule and keeps tomorrow already organized.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { icon: <CalendarIcon />, title: 'Smart scheduling.', desc: 'Tasks arrange themselves around your focus time.' },
                { icon: <BoltIcon />, title: 'Built-in assistant.', desc: 'Ask anything about your week in plain language.' },
                { icon: <Lock2Icon />, title: 'Yours alone.', desc: 'Your data stays private. Always.' },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '8px',
                    background: 'var(--accent-soft)', border: '1px solid rgba(217,119,87,0.22)',
                    color: 'var(--accent-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: '1px',
                  }}>
                    {f.icon}
                  </div>
                  <div><span style={{ color: 'var(--text)', fontWeight: 550, marginRight: '4px' }}>{f.title}</span>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <MiniCalendar />
        </div>

        {/* ─── Right: form ─── */}
        <div style={{ padding: '36px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--panel)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '32px', right: '36px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            {mode === 'signin' ? 'New here?' : 'Already have an account?'}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }} style={{
              background: 'none', border: 'none', color: 'var(--text)', fontWeight: 500,
              marginLeft: '4px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12.5px',
              borderBottom: '1px solid transparent', padding: 0,
            }}>
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </div>

          <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--text)', margin: '0 0 8px' }}>
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {mode === 'signin' ? 'Sign in to pick up where you left off.' : 'Start planning smarter today.'}
              </p>
            </div>

            {/* SSO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
              {[
                { label: 'Google', icon: <GoogleIcon />, action: handleGoogle },
                { label: 'Apple', icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.4 1.5c0 1.2-.5 2.4-1.3 3.3-.9.9-2.2 1.6-3.4 1.5-.1-1.2.5-2.4 1.3-3.2.9-.9 2.3-1.6 3.4-1.6zm4 16.6c-.6 1.4-1 2-1.7 3.2-1 1.7-2.5 3.7-4.3 3.7-1.6 0-2.1-1.1-4.3-1-2.2 0-2.7 1-4.4 1-1.8 0-3.2-1.9-4.2-3.5C-1 17.6-1.5 11 1.6 7.4c1.6-1.7 3.7-2.7 5.6-2.7 1.9 0 3.1 1 4.7 1 1.5 0 2.4-1 4.6-1 1.7 0 3.5.9 4.7 2.5-4.2 2.3-3.5 8.3.2 9.9z"/>
                  </svg>
                ), action: () => {} },
              ].map(btn => (
                <button key={btn.label} type="button" onClick={btn.action} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  height: '42px', borderRadius: '10px', background: '#1a1a1a',
                  border: '1px solid var(--border)', color: 'var(--text)',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}>
                  {btn.icon}{btn.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0', color: 'var(--text-faint)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-soft)' }} />
              or continue with email
              <div style={{ flex: 1, height: '1px', background: 'var(--border-soft)' }} />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                  color: '#fca5a5', fontSize: '12.5px', padding: '9px 12px',
                  borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  ⚠ {error}
                </div>
              )}

              {/* Email */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '7px', fontWeight: 500 }}>Email</div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '13px', color: 'var(--text-muted)', pointerEvents: 'none' }}><MailIcon /></span>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" autoComplete="email"
                    style={{
                      width: '100%', height: '42px', borderRadius: '10px',
                      background: '#1a1a1a', border: '1px solid var(--border)',
                      color: 'var(--text)', fontFamily: 'inherit', fontSize: '13.5px',
                      padding: '0 13px 0 38px', outline: 'none', letterSpacing: '-0.005em',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(217,119,87,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(217,119,87,0.10)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px', color: 'var(--text-2)', marginBottom: '7px', fontWeight: 500 }}>
                  <span>Password</span>
                  {mode === 'signin' && <span style={{ fontSize: '11.5px', color: 'var(--accent-2)', cursor: 'pointer' }}>Forgot?</span>}
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '13px', color: 'var(--text-muted)', pointerEvents: 'none' }}><LockIcon /></span>
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    style={{
                      width: '100%', height: '42px', borderRadius: '10px',
                      background: '#1a1a1a', border: '1px solid var(--border)',
                      color: 'var(--text)', fontFamily: 'inherit', fontSize: '13.5px',
                      padding: '0 42px 0 38px', outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(217,119,87,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(217,119,87,0.10)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position: 'absolute', right: '8px', width: '28px', height: '28px',
                    background: 'transparent', border: 'none', borderRadius: '6px',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 22px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setRemember(v => !v)}>
                  <span style={{
                    width: '16px', height: '16px', borderRadius: '5px', flexShrink: 0,
                    border: remember ? 'none' : '1.5px solid #3a3a3a',
                    background: remember ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {remember && <CheckIcon />}
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>Remember me for 30 days</span>
                </label>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                width: '100%', height: '44px', borderRadius: '10px',
                background: 'var(--accent)', border: 'none',
                color: '#fff', fontFamily: 'inherit', fontSize: '14px', fontWeight: 550,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 14px rgba(217,119,87,0.28)',
                transition: 'all 0.15s', letterSpacing: '-0.005em',
              }}>
                {loading ? (
                  <>
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : (
                  <>{mode === 'signin' ? 'Sign in' : 'Create account'}<ArrowIcon /></>
                )}
              </button>
            </form>

            <div style={{ marginTop: '22px', fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.55 }}>
              By continuing you agree to our{' '}
              <span style={{ color: 'var(--text-2)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>Terms</span>
              {' '}and{' '}
              <span style={{ color: 'var(--text-2)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>Privacy Policy</span>.
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
