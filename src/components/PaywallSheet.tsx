import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  headline?: string
  subhead?: string
}

const BULLETS = [
  { icon: '∞', title: 'Unlimited projects', body: 'Organize everything you juggle in one place.' },
  { icon: '⭑', title: 'Unlimited habits',   body: 'Build the routines that stick.' },
  { icon: '🤝', title: 'Coop team features + AI assistant', body: 'Invite your team and get answers instantly.' },
]

export default function PaywallSheet({ open, onClose, headline, subhead }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) setVisible(true)
    else { const t = setTimeout(() => setVisible(false), 300); return () => clearTimeout(t) }
  }, [open])

  if (!open && !visible) return null
  const shown = open && visible

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 800,
        background: shown ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0)',
        backdropFilter: shown ? 'blur(6px)' : 'none',
        WebkitBackdropFilter: shown ? 'blur(6px)' : 'none',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: 'background 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: 'linear-gradient(180deg, #2A211E, var(--surface) 50%)',
          borderRadius: '28px 28px 0 0',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 22px)',
          boxShadow: 'var(--sheet-shadow)',
          transform: `translateY(${shown ? 0 : 100}%)`,
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div style={{ padding: '18px 24px 24px' }}>
          <div style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
            Planer Pro
          </div>
          <div style={{ font: '300 28px/1.15 var(--font-sans)', letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 8 }}>
            {headline ?? 'Upgrade to Pro'}
          </div>
          <div style={{ font: '400 14px/1.5 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 22 }}>
            {subhead ?? 'Remove all limits and unlock the collaboration features.'}
          </div>

          {/* Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
            {BULLETS.map(b => (
              <div key={b.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  font: '700 16px/1 var(--font-sans)', flexShrink: 0,
                }}>{b.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: '600 14px/1.3 var(--font-sans)', color: 'var(--text)' }}>{b.title}</div>
                  <div style={{ font: '400 12.5px/1.4 var(--font-sans)', color: 'var(--text-muted)', marginTop: 2 }}>{b.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, justifyContent: 'center' }}>
            <span style={{ font: '700 32px/1 var(--font-sans)', color: 'var(--text)' }}>$4.99</span>
            <span style={{ font: '400 14px/1 var(--font-sans)', color: 'var(--text-muted)' }}>/ month</span>
          </div>
          <div style={{ font: '400 11.5px/1 var(--font-sans)', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 18 }}>
            or $39.99 / year — save 33%
          </div>

          <button
            onClick={() => alert('Coming soon!')}
            style={{
              width: '100%', height: 52, borderRadius: 14, border: 'none',
              background: 'var(--accent)', color: '#fff',
              font: '600 15px/1 var(--font-sans)', letterSpacing: '-0.01em',
              boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px var(--accent-glow)',
              cursor: 'pointer', marginBottom: 8,
            }}
          >Start 7-day free trial</button>
          <div style={{ font: '400 11px/1.4 var(--font-sans)', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
            Cancel anytime
          </div>

          <button
            onClick={onClose}
            style={{ width: '100%', background: 'none', border: 'none', font: '500 12px/1 var(--font-sans)', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 0' }}
          >Maybe later</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
