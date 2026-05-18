import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'
import { UserIcon, SunIcon, MoonIcon, SignOutIcon } from './icons'

export default function SettingsScreen() {
  const { theme, setTheme } = useTaskStore()
  const [email, setEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null)
    })
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      window.location.reload()
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg)', overflowY: 'auto',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>Settings</h1>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* ── Account ── */}
        <div className="settings-section-label">Account</div>
        <div className="settings-card">
          <div className="settings-row">
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <UserIcon size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email ?? '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Free plan</div>
            </div>
          </div>
        </div>

        {/* ── Appearance ── */}
        <div className="settings-section-label">Appearance</div>
        <div className="settings-card">
          <div className="settings-row" style={{ cursor: 'default' }}>
            <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Theme</div>
            <div className="seg">
              <button
                className={`seg-pill${theme === 'light' ? ' on' : ''}`}
                onClick={() => setTheme('light')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <SunIcon />
                  Light
                </span>
              </button>
              <button
                className={`seg-pill${theme === 'dark' ? ' on' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MoonIcon />
                  Dark
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className="settings-section-label">Notifications</div>
        <div className="settings-card">
          <div className="settings-row" style={{ cursor: 'default' }}>
            <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Reminders</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 6px',
                borderRadius: '999px', background: 'var(--accent-soft)', color: 'var(--accent)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>Soon</span>
              {/* Disabled toggle */}
              <div style={{
                width: '28px', height: '16px', borderRadius: '8px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                position: 'relative', opacity: 0.5,
              }}>
                <div style={{
                  position: 'absolute', top: '2px', left: '2px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: 'var(--text-muted)',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            width: '100%', padding: '13px', marginTop: '20px',
            borderRadius: '14px', border: '1px solid var(--danger-border)',
            background: 'var(--danger-soft)',
            color: signingOut ? 'var(--text-muted)' : 'var(--danger)',
            fontSize: '13px', fontWeight: 600,
            cursor: signingOut ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {signingOut ? (
            <span style={{
              width: '13px', height: '13px', borderRadius: '50%',
              border: '2px solid var(--danger-border)', borderTopColor: 'var(--danger)',
              animation: 'spin 0.7s linear infinite', display: 'inline-block',
            }} />
          ) : (
            <SignOutIcon />
          )}
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>

        {/* Version */}
        <div style={{
          textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)',
          padding: '24px 0', letterSpacing: '0.02em',
        }}>
          Planer v0.1.0
        </div>
      </div>
    </div>
  )
}
