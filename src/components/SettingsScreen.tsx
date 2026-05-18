import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'
import { SunIcon, MoonIcon, IcoBell, IcoLock, IcoHelp, SignOutIcon, ChevronRight } from './icons'

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

  const initial = email ? email[0].toUpperCase() : '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflowY: 'auto', paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 10px) + 76px)' }}>
      {/* Header */}
      <div style={{ padding: '28px 24px 20px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)' }}>You</h1>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Profile card */}
        <div style={{ background: 'var(--surface)', borderRadius: '22px', padding: '22px', boxShadow: 'var(--card-shadow)', display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '18px', fontWeight: 600,
            boxShadow: '0 4px 12px var(--accent-glow)',
          }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 450, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email ?? '—'}
            </div>
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', background: 'var(--accent-soft)', color: 'var(--accent-2)', borderRadius: '999px' }}>
                Free
              </span>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="settings-section-label">Appearance</div>
        <div className="settings-card">
          <div className="settings-row" style={{ cursor: 'default' }}>
            <div className="set-icon">
              {theme === 'light' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
            </div>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>Theme</span>
            {/* Theme pills */}
            <div style={{ display: 'inline-flex', background: 'var(--surface2)', borderRadius: '999px', padding: '3px', gap: '2px' }}>
              {(['light', 'dark'] as const).map(t => (
                <button key={t} onClick={() => setTheme(t)} style={{
                  width: '38px', height: '30px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                  background: theme === t ? 'var(--surface)' : 'transparent',
                  boxShadow: theme === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-2)', transition: 'all 0.2s',
                }}>
                  {t === 'light' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-section-label">Notifications</div>
        <div className="settings-card">
          <div className="settings-row" style={{ opacity: 0.55, cursor: 'default' }}>
            <div className="set-icon"><IcoBell size={16} /></div>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>Reminders</span>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', background: 'var(--accent-soft)', color: 'var(--accent-2)', borderRadius: '999px' }}>Soon</span>
          </div>
        </div>

        {/* Account */}
        <div className="settings-section-label">Account</div>
        <div className="settings-card">
          <div className="settings-row" style={{ opacity: 0.6, cursor: 'default' }}>
            <div className="set-icon"><IcoLock size={16} /></div>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>Privacy</span>
            <ChevronRight size={14} />
          </div>
          <div className="settings-row" style={{ opacity: 0.6, cursor: 'default' }}>
            <div className="set-icon"><IcoHelp size={16} /></div>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>Help & feedback</span>
            <ChevronRight size={14} />
          </div>
          <button className="settings-row" onClick={handleSignOut} disabled={signingOut} style={{ width: '100%', textAlign: 'left', opacity: signingOut ? 0.5 : 1 }}>
            <div className="set-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              {signingOut
                ? <span style={{ width: '13px', height: '13px', borderRadius: '50%', border: '2px solid var(--danger-border)', borderTopColor: 'var(--danger)', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                : <SignOutIcon size={14} />}
            </div>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--danger)' }}>
              {signingOut ? 'Signing out...' : 'Sign out'}
            </span>
          </button>
        </div>

        {/* Version */}
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 450, color: 'var(--text-muted)', padding: '16px 0 28px', letterSpacing: '0.02em' }}>
          Planer · v2.0
        </div>
      </div>
    </div>
  )
}
