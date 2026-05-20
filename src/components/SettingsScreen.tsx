import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { IcoBell, IcoLock, IcoHelp, SignOutIcon, ChevronRight } from './icons'

export default function SettingsScreen() {
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
      <div style={{ padding: '28px 24px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Dino logo mini */}
        <svg width="28" height="33" viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="28" y="1"  width="5" height="9"  rx="2.5" fill="#2BAB78"/>
          <rect x="22" y="6"  width="4" height="7"  rx="2"   fill="#2BAB78"/>
          <rect x="17" y="10" width="3.5" height="6" rx="1.75" fill="#2BAB78"/>
          <rect x="22" y="7"  width="18" height="17" rx="7" fill="#3CC68A"/>
          <rect x="36" y="17" width="14" height="10" rx="5" fill="#3CC68A"/>
          <rect x="46" y="19" width="2.5" height="2.5" rx="1.25" fill="#2BAB78"/>
          <circle cx="37" cy="13" r="3.5" fill="#06141B"/>
          <circle cx="38" cy="12" r="1.2" fill="#CCD0CF"/>
          <rect x="20" y="20" width="16" height="8" rx="4" fill="#3CC68A"/>
          <rect x="6" y="22" width="28" height="24" rx="9" fill="#3CC68A"/>
          <rect x="10" y="27" width="16" height="15" rx="6" fill="#2BAB78"/>
          <path d="M6 36 C0 34, -2 40, 4 42" stroke="#3CC68A" strokeWidth="7" strokeLinecap="round" fill="none"/>
          <rect x="9"  y="42" width="10" height="12" rx="5" fill="#3CC68A"/>
          <rect x="22" y="42" width="10" height="12" rx="5" fill="#3CC68A"/>
          <rect x="7"  y="51" width="13" height="5" rx="2.5" fill="#2BAB78"/>
          <rect x="20" y="51" width="13" height="5" rx="2.5" fill="#2BAB78"/>
        </svg>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)' }}>You</h1>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Profile card */}
        <div style={{ background: 'var(--surface)', borderRadius: '22px', padding: '22px', boxShadow: 'var(--card-shadow)', display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-ink)', fontSize: '18px', fontWeight: 600,
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
          Dino Task · v2.1
        </div>
      </div>
    </div>
  )
}
