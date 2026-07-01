import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'
import { IcoLock, IcoHelp, SignOutIcon, ChevronRight } from './icons'

export default function SettingsScreen() {
  const { profile } = useTaskStore()
  const [email, setEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyId() {
    if (!profile?.planer_id) return
    navigator.clipboard.writeText(profile.planer_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflowY: 'auto', paddingBottom: '90px' }}>
      {/* Header */}
      <div style={{ padding: '6px 24px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            {profile?.planer_id && (
              <div style={{
                marginTop: 14, background: 'var(--surface2)',
                borderRadius: 12, padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ font: '600 9px/1 var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Planer ID
                  </div>
                  <div style={{ font: '700 18px/1 var(--font-sans)', color: 'var(--accent)', letterSpacing: '0.06em', fontFamily: 'ui-monospace, monospace' }}>
                    {profile.planer_id}
                  </div>
                </div>
                <button
                  onClick={copyId}
                  style={{
                    padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: copied ? 'var(--success-soft)' : 'var(--surface3)',
                    color: copied ? 'var(--success)' : 'var(--text-2)',
                    font: '600 11px/1 var(--font-sans)', transition: 'all 0.2s',
                  }}
                >{copied ? 'Copied!' : 'Copy'}</button>
              </div>
            )}
            {profile?.planer_id && (
              <div style={{ marginTop: 10, font: '400 11px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>
                Share your Planer ID with teammates so they can add you to shared projects.
              </div>
            )}
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
          Planer · v2.1
        </div>
      </div>
    </div>
  )
}
