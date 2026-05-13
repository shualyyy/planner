import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const [email, setEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [visible, setVisible] = useState(false)

  const isMobile = useIsMobile()
  const shown = isOpen && visible

  // Fetch user email
  useEffect(() => {
    if (isOpen) {
      supabase.auth.getSession().then(({ data }) => {
        setEmail(data.session?.user?.email ?? null)
      })
    }
  }, [isOpen])

  // Mount / unmount animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      window.location.reload()
    } catch {
      setSigningOut(false)
    }
  }

  if (!isOpen && !visible) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        opacity: shown ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: isMobile ? '100%' : '380px',
          background: 'var(--panel)',
          border: isMobile ? 'none' : '1px solid var(--border)',
          borderTop: '1px solid var(--border)',
          borderRadius: isMobile ? '18px 18px 0 0' : '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          transform: shown
            ? 'translateY(0)'
            : isMobile ? 'translateY(100%)' : 'translateY(12px)',
          transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle (mobile only) */}
        {isMobile && (
          <div style={{
            width: '36px', height: '4px', borderRadius: '2px',
            background: '#333', margin: '-8px auto 0',
          }} />
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Settings
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Account section */}
        <div style={{
          background: 'var(--panel-2)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px 6px',
            fontSize: '10.5px', fontWeight: 500,
            color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Account
          </div>
          <div style={{
            padding: '10px 14px 14px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            {/* Avatar placeholder */}
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'var(--accent-soft)',
              border: '1px solid rgba(217,119,87,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email ?? '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Signed in
              </div>
            </div>
          </div>
        </div>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            width: '100%', padding: '11px',
            borderRadius: '10px', border: '1px solid rgba(239,68,68,0.25)',
            background: 'rgba(239,68,68,0.07)',
            color: signingOut ? 'var(--text-muted)' : 'var(--danger-text)',
            fontSize: '13px', fontWeight: 600,
            cursor: signingOut ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (!signingOut) (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.13)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.07)'
          }}
        >
          {signingOut ? (
            <span style={{
              width: '13px', height: '13px', borderRadius: '50%',
              border: '2px solid rgba(248,113,113,0.3)', borderTopColor: 'var(--danger-text)',
              animation: 'spin 0.7s linear infinite', display: 'inline-block',
            }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          )}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
