import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'

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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                  Light
                </span>
              </button>
              <button
                className={`seg-pill${theme === 'dark' ? ' on' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
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
