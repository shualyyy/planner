import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { IcoLock, IcoHelp, SignOutIcon, ChevronRight, SunIcon, MoonIcon } from './icons'
import StatsScreen from './StatsScreen'
import PaywallSheet from './PaywallSheet'

const AVATAR_COLORS = ['#CC785C', '#61AAF2', '#3DD68C', '#A78BFA', '#F5BDD0', '#D4A27F', '#CC5247', '#8ED4C8']

function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, fetchProfile } = useTaskStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#CC785C')
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)

  const dragStartY = useRef(0)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (open && profile) {
      setName(profile.display_name ?? '')
      setColor(profile.avatar_color ?? '#CC785C')
      setVisible(true)
    } else if (!open) {
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [open, profile])

  async function save() {
    if (!profile) return
    setSaving(true)
    try {
      await supabase.from('user_profiles').update({
        display_name: name.trim() || null,
        avatar_color: color,
      }).eq('id', profile.id)
      await fetchProfile()
      onClose()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  if (!open && !visible) return null
  const shown = open && visible

  function onSheetDragStart(e: React.TouchEvent) { dragStartY.current = e.touches[0].clientY; setIsDragging(true) }
  function onSheetDragMove(e: React.TouchEvent) { setDragY(Math.max(0, e.touches[0].clientY - dragStartY.current)) }
  function onSheetDragEnd() { setIsDragging(false); if (dragY > 100) { setDragY(0); onClose() } else setDragY(0) }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 700,
        background: shown ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0)',
        backdropFilter: shown ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: shown ? 'blur(4px)' : 'none',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: 'background 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={onSheetDragStart}
        onTouchMove={onSheetDragMove}
        onTouchEnd={onSheetDragEnd}
        style={{
          width: '100%', maxWidth: 560, background: 'var(--surface)',
          borderRadius: '28px 28px 0 0',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          boxShadow: 'var(--sheet-shadow)',
          transform: `translateY(${shown ? dragY : 100}%)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        <div style={{ padding: '10px 22px 22px' }}>
          <div style={{ font: '600 12px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
            Edit profile
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', font: '700 26px/1 var(--font-sans)',
              boxShadow: `0 4px 24px ${color}55`,
            }}>
              {(name || profile?.email || '?').trim()[0]?.toUpperCase() ?? '?'}
            </div>
          </div>

          {/* Name */}
          <div style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Display name
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px',
              color: 'var(--text)', font: '500 15px/1.2 var(--font-sans)',
              outline: 'none', boxSizing: 'border-box', marginBottom: 18,
            }}
          />

          {/* Colors */}
          <div style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Avatar color
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
            {AVATAR_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer',
                boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : 'none',
                transform: color === c ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }} />
            ))}
          </div>

          <button
            onClick={save}
            disabled={saving}
            style={{
              width: '100%', height: 48, borderRadius: 14, border: 'none',
              background: saving ? 'var(--surface2)' : 'var(--accent)',
              color: saving ? 'var(--text-muted)' : '#fff',
              font: '600 14px/1 var(--font-sans)',
              boxShadow: saving ? 'none' : '0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px var(--accent-glow)',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function SettingsScreen() {
  const { profile, pendingInvites, fetchPendingInvites, acceptInvite, declineInvite, fetchProjects, theme, setTheme } = useTaskStore()
  const { subscribed, supported, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications()
  const [email, setEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)

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

  useEffect(() => { fetchPendingInvites() }, [fetchPendingInvites])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      window.location.reload()
    } catch {
      setSigningOut(false)
    }
  }

  async function handleAccept(id: string) {
    await acceptInvite(id)
    await fetchProjects() // pull in the newly joined project
  }

  const displayName = profile?.display_name?.trim()
  const initial = (displayName ?? email ?? '?')[0]?.toUpperCase() ?? '?'
  const avatarColor = profile?.avatar_color ?? '#CC785C'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflowY: 'auto', paddingBottom: '90px' }}>
      {/* Header */}
      <div style={{ padding: '6px 24px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)' }}>You</h1>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Profile card (tap to edit) */}
        <button
          onClick={() => setEditOpen(true)}
          style={{
            background: 'var(--surface)', borderRadius: '22px', padding: '22px',
            boxShadow: 'var(--card-shadow)', display: 'flex', gap: '16px',
            alignItems: 'center', marginBottom: '14px',
            border: 'none', textAlign: 'left', cursor: 'pointer',
          }}
        >
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
            background: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '20px', fontWeight: 700,
            boxShadow: `0 4px 12px ${avatarColor}55`,
          }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {displayName && (
              <div style={{ font: '600 17px/1.2 var(--font-sans)', color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
            )}
            <div style={{ fontSize: '12.5px', fontWeight: 450, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email ?? '—'}
            </div>
            <div style={{ marginTop: '6px' }}>
              {(profile?.plan ?? 'free') === 'pro' ? (
                <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '4px 10px', background: 'var(--accent)', color: '#fff', borderRadius: '999px' }}>
                  Pro
                </span>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setPaywallOpen(true) }}
                  style={{ border: 'none', cursor: 'pointer', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 12px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '999px' }}
                >
                  Upgrade →
                </button>
              )}
            </div>
            {profile?.planer_id && (
              <div
                onClick={e => { e.stopPropagation() }}
                style={{
                  marginTop: 14, background: 'var(--surface2)',
                  borderRadius: 12, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ font: '600 9px/1 var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Planer ID
                  </div>
                  <div style={{ font: '700 18px/1 var(--font-sans)', color: 'var(--accent)', letterSpacing: '0.06em', fontFamily: 'ui-monospace, monospace' }}>
                    {profile.planer_id}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); copyId() }}
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
        </button>

        {/* Invites */}
        {pendingInvites.length > 0 && (
          <>
            <div className="settings-section-label">Invites</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingInvites.map(inv => (
                <div key={inv.id} style={{
                  background: 'var(--surface)', borderRadius: 14, padding: '14px 16px',
                  boxShadow: 'var(--card-shadow)', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: inv.project?.color ?? 'var(--accent)', flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '500 13px/1.3 var(--font-sans)', color: 'var(--text)' }}>
                      Invited to <b style={{ fontWeight: 700 }}>{inv.project?.name ?? 'a project'}</b>
                    </div>
                    <div style={{ font: '500 10.5px/1 var(--font-sans)', color: 'var(--text-muted)', marginTop: 3, textTransform: 'capitalize' }}>
                      {inv.role}
                    </div>
                  </div>
                  <button
                    onClick={() => declineInvite(inv.id)}
                    style={{ padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text-muted)', font: '600 11px/1 var(--font-sans)' }}
                  >Decline</button>
                  <button
                    onClick={() => handleAccept(inv.id)}
                    style={{ padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', font: '600 11px/1 var(--font-sans)' }}
                  >Accept</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Appearance */}
        <div className="settings-section-label">Appearance</div>
        <div className="settings-card">
          <button
            className="settings-row"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
          >
            <div className="set-icon">
              {theme === 'dark' ? <MoonIcon size={15} /> : <SunIcon size={15} />}
            </div>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>Theme</span>
            <span style={{
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', padding: '4px 10px',
              background: 'var(--surface2)', color: 'var(--text-2)',
              borderRadius: '999px',
            }}>
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
          {supported && (
            <button
              className="settings-row"
              onClick={() => subscribed ? unsubscribe() : subscribe()}
              disabled={pushLoading}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', opacity: pushLoading ? 0.6 : 1 }}
            >
              <div className="set-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>Notifications</span>
              <div style={{
                width: 44, height: 26, borderRadius: 13,
                background: subscribed ? 'var(--accent)' : 'var(--surface3)',
                position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: subscribed ? 21 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </div>
            </button>
          )}
        </div>

        {/* Account */}
        <div className="settings-section-label">Account</div>
        <div className="settings-card">
          <button className="settings-row" onClick={() => setStatsOpen(true)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <div className="set-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="20" x2="6" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/></svg>
            </div>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>Stats</span>
            <ChevronRight size={14} />
          </button>
          <a
            className="settings-row"
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="set-icon"><IcoLock size={16} /></div>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>Privacy Policy</span>
            <ChevronRight size={14} />
          </a>
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

      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
      {statsOpen && <StatsScreen onClose={() => setStatsOpen(false)} />}
      <PaywallSheet open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  )
}
