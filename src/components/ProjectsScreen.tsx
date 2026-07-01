import { useState, useMemo, useEffect } from 'react'
import type { Task, Project, TaskStatus } from '../services/supabase'
import { TASK_STATUSES, TASK_PRIORITIES } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'

interface ProjectsScreenProps {
  tasks: Record<string, (Task & { done: boolean })[]>
  onToggle: (dateKey: string, taskId: string) => void
  onDelete: (dateKey: string, taskId: string) => void
  onEdit: (task: Task) => void
  onAddProject: () => void
  onEditProject: (p: Project) => void
  onAddTask: (projectId?: string) => void
  onDetailChange?: (open: boolean) => void
}

const STATUS_ORDER: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'done']

function effStatus(t: Task, done: boolean): TaskStatus {
  return done ? 'done' : (t.status ?? 'not_started')
}

/* ─── Kanban status icon ─── */
function StatusIcon({ status }: { status: TaskStatus }) {
  const base: React.CSSProperties = { width: 14, height: 14, borderRadius: '50%', flexShrink: 0 }
  if (status === 'not_started') return <span style={{ ...base, border: '2px solid rgba(255,255,255,0.3)' }} />
  if (status === 'in_progress') return <span style={{ ...base, border: '2px solid #D97757', background: 'linear-gradient(90deg,#D97757 50%,transparent 50%)' }} />
  if (status === 'blocked') return <span style={{ ...base, border: '2px solid #FF5C5C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 6, height: 1.5, background: '#FF5C5C' }} /></span>
  return <span style={{ ...base, background: '#3DD68C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
}

/* ─── Project detail (Kanban) ─── */
function ProjectDetailView({ project, onBack, onAddTask }: {
  project: Project
  onBack: () => void
  onAddTask: (projectId?: string) => void
}) {
  const { tasks, donIds, members, fetchMembers, inviteMember, removeMember, profile } = useTaskStore()
  const [showMembersSheet, setShowMembersSheet] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteId, setInviteId] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor'|'viewer'>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    if (project?.id) fetchMembers(project.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  const byStatus = useMemo(() => {
    const g: Record<TaskStatus, (Task & { done: boolean })[]> = { not_started: [], in_progress: [], blocked: [], done: [] }
    for (const t of tasks) {
      if (t.project_id !== project.id) continue
      const done = donIds.has(t.id)
      g[effStatus(t, done)].push({ ...t, done })
    }
    return g
  }, [tasks, donIds, project.id])

  const total = STATUS_ORDER.reduce((s, k) => s + byStatus[k].length, 0)
  const doneCount = byStatus.done.length
  const pct = total > 0 ? Math.round(doneCount / total * 100) : 0

  const metrics = [
    { value: total, label: 'Total', color: '#F0ECE3' },
    { value: byStatus.in_progress.length, label: 'Active', color: '#D97757' },
    { value: byStatus.blocked.length, label: 'Blocked', color: '#FF5C5C' },
    { value: `${pct}%`, label: 'Done', color: '#3DD68C' },
  ]

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>
      {/* Header */}
      <div style={{ padding: '8px 22px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{ font: '500 13px/1.2 var(--font-sans)', color: '#D97757', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            ← Projects
          </button>
          {/* Members button — quick access */}
          <button
            onClick={() => { fetchMembers(project.id); setShowMembersSheet(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 999, background: '#2D2926', border: '1px solid rgba(255,255,255,0.09)', cursor: 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            <span style={{ font: '600 11px/1 var(--font-sans)', color: 'rgba(255,255,255,0.55)' }}>
              {(members[project.id]?.length ?? 0) > 0 ? members[project.id].length : '+'}
            </span>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
          <h1 style={{ font: '300 30px/1 var(--font-sans)', color: '#F0ECE3' }}>{project.name}</h1>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: '16px 22px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', background: '#242120', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ font: '600 18px/1.2 var(--font-sans)', color: m.color }}>{m.value}</div>
              <div style={{ font: '500 9px/1.2 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Board label */}
      <div style={{ padding: '18px 22px 12px', flexShrink: 0 }}>
        <span style={{ font: '600 10px/1.2 var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D97757' }}>Board</span>
      </div>

      {/* Kanban + Members (vertical scroll) */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(74px + env(safe-area-inset-bottom, 0px) + 70px)' }}>
      <div style={{ overflowX: 'auto', padding: '0 22px' }}>
        <div style={{ display: 'flex', gap: 12, minHeight: 400 }}>
          {STATUS_ORDER.map(st => {
            const list = byStatus[st]
            const blocked = st === 'blocked'
            const isDone = st === 'done'
            return (
              <div key={st} style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
                  <StatusIcon status={st} />
                  <span style={{ font: '600 12px/1.2 var(--font-sans)', color: '#F0ECE3' }}>{TASK_STATUSES[st].name}</span>
                  <span style={{ font: '600 10px/1.2 var(--font-sans)', background: '#2D2926', borderRadius: 999, padding: '2px 7px', color: 'rgba(255,255,255,0.5)' }}>{list.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, overflowY: 'auto', flex: 1 }}>
                  {list.map(t => (
                    <div key={`${t.id}-${t.task_date}`} onClick={() => {}}
                      style={{ background: '#242120', border: `1px solid ${blocked ? 'rgba(255,92,92,0.18)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '12px 13px', opacity: isDone ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: t.priority ? TASK_PRIORITIES[t.priority].color : 'rgba(255,255,255,0.3)' }} />
                        <span style={{ font: '500 13px/1.2 var(--font-sans)', color: isDone ? 'rgba(255,255,255,0.2)' : '#F0ECE3', textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.35 }}>{t.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#241F1C', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 9px/1.2 var(--font-sans)', color: '#C8C2B8' }}>AP</span>
                        {t.time_estimate != null && (
                          <span style={{ font: '500 10px/1.2 var(--font-sans)', background: '#2D2926', borderRadius: 6, padding: '3px 7px', color: 'rgba(255,255,255,0.45)' }}>
                            {t.time_estimate >= 60 ? `${Math.round(t.time_estimate / 60)}h` : `${t.time_estimate}m`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div style={{ font: '400 11px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.2)', padding: '8px 2px' }}>—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      </div>

      {/* ── Members bottom sheet ── */}
      {showMembersSheet && (
        <div
          onClick={() => { setShowMembersSheet(false); setShowInvite(false); setInviteId(''); setInviteError('') }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--surface)', borderRadius: '24px 24px 0 0', padding: '0 0 max(env(safe-area-inset-bottom,0px),20px)', boxShadow: 'var(--sheet-shadow)', animation: 'slideUp 0.22s ease' }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 14px' }}>
              <span style={{ font: '600 16px/1.2 var(--font-sans)', color: 'var(--text)' }}>Members</span>
              <button
                onClick={() => { setShowInvite(true) }}
                style={{ display: showInvite ? 'none' : 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 999, background: 'var(--accent-soft)', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: '600 12px/1 var(--font-sans)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Invite
              </button>
            </div>

            {/* Invite form */}
            {showInvite && (
              <div style={{ margin: '0 20px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  autoFocus
                  value={inviteId}
                  onChange={e => setInviteId(e.target.value.toUpperCase())}
                  placeholder="Planer ID (e.g. AB-C2D3)"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', font: '600 15px/1 ui-monospace, monospace', outline: 'none', letterSpacing: '0.07em', width: '100%' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['editor','viewer'] as const).map(r => (
                    <button key={r} onClick={() => setInviteRole(r)}
                      style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: inviteRole === r ? 'var(--accent-soft)' : 'transparent', color: inviteRole === r ? 'var(--accent)' : 'var(--text-muted)', font: '600 11px/1 var(--font-sans)', cursor: 'pointer', textTransform: 'capitalize' }}
                    >{r}</button>
                  ))}
                </div>
                {inviteError && <div style={{ font: '400 11px/1.4 var(--font-sans)', color: 'var(--danger)' }}>{inviteError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowInvite(false); setInviteId(''); setInviteError('') }}
                    style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: 'var(--surface)', color: 'var(--text-muted)', font: '600 12px/1 var(--font-sans)', cursor: 'pointer' }}
                  >Cancel</button>
                  <button
                    onClick={async () => {
                      if (!inviteId.trim()) return
                      setInviting(true); setInviteError('')
                      try {
                        await inviteMember(project.id, inviteId.trim(), inviteRole)
                        await fetchMembers(project.id)
                        setShowInvite(false); setInviteId('')
                      } catch (e) {
                        setInviteError(e instanceof Error ? e.message : 'Failed to invite')
                      }
                      setInviting(false)
                    }}
                    disabled={inviting || !inviteId.trim()}
                    style={{ flex: 2, height: 40, borderRadius: 10, border: 'none', background: inviteId.trim() ? 'var(--accent)' : 'var(--surface)', color: inviteId.trim() ? '#fff' : 'var(--text-muted)', font: '600 13px/1 var(--font-sans)', cursor: inviteId.trim() ? 'pointer' : 'not-allowed' }}
                  >{inviting ? 'Adding…' : 'Add member'}</button>
                </div>
              </div>
            )}

            {/* Member list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 20px', maxHeight: 260, overflowY: 'auto' }}>
              {/* Always show self */}
              {profile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: profile.avatar_color ?? 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 13px/1 var(--font-sans)', color: '#fff', flexShrink: 0 }}>
                    {(profile.display_name ?? profile.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--text)' }}>You</div>
                    <div style={{ font: '400 10px/1.2 var(--font-sans)', color: 'var(--text-muted)', marginTop: 2 }}>{profile.planer_id} · Owner</div>
                  </div>
                </div>
              )}
              {(members[project.id] || []).filter(m => m.user_id !== profile?.id).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: m.profile?.avatar_color ?? 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 13px/1 var(--font-sans)', color: '#fff', flexShrink: 0 }}>
                    {(m.profile?.display_name ?? m.profile?.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.profile?.display_name ?? m.profile?.email ?? m.profile?.planer_id ?? '—'}
                    </div>
                    <div style={{ font: '400 10px/1.2 var(--font-sans)', color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>{m.role}</div>
                  </div>
                  <button onClick={() => removeMember(project.id, m.user_id)} style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}>Remove</button>
                </div>
              ))}
              {(members[project.id] || []).filter(m => m.user_id !== profile?.id).length === 0 && !showInvite && (
                <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--text-muted)', padding: '4px 14px 6px', textAlign: 'center' }}>
                  No other members yet. Tap Invite to add teammates.
                </div>
              )}
            </div>
            <div style={{ height: 8 }} />
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => onAddTask(project.id)}
        style={{
          position: 'absolute', bottom: 'calc(74px + env(safe-area-inset-bottom, 0px) + 16px)', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 7, height: 48, padding: '0 22px',
          borderRadius: 999, background: '#D97757', color: '#fff', font: '600 14px/1.2 var(--font-sans)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 8px 24px var(--accent-glow)', border: 'none', zIndex: 5,
        }}
      ><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Task</button>
    </div>
  )
}

/* ─── Project card ─── */
function ProjectCard({ project, stats, onTap }: {
  project: Project
  stats: { total: number; done: number; inProgress: number; blocked: number }
  onTap: () => void
}) {
  const pct = stats.total > 0 ? Math.round(stats.done / stats.total * 100) : 0
  return (
    <button
      onClick={onTap}
      style={{
        position: 'relative', height: 88, width: '100%', background: '#242120',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden',
        display: 'flex', alignItems: 'center', padding: '0 16px 0 19px', gap: 14,
        cursor: 'pointer', opacity: project.is_archived ? 0.4 : 1, textAlign: 'left',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: '0 3px 3px 0', background: project.color }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '600 15px/1.2 var(--font-sans)', color: '#F0ECE3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
        <div style={{ font: '400 11px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{stats.total} task{stats.total !== 1 ? 's' : ''}</div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <div style={{ width: 80, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: project.color, borderRadius: 999 }} />
        </div>
        <div style={{ font: '600 10px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.55)', marginTop: 5 }}>{pct}%</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {[
          { c: '#D97757', n: stats.inProgress },
          { c: '#FF5C5C', n: stats.blocked },
          { c: '#3DD68C', n: stats.done },
        ].map((row, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: row.c }} />
            <span style={{ font: '500 10px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.5)' }}>{row.n}</span>
          </span>
        ))}
      </div>

      <span style={{ font: '300 20px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>›</span>
    </button>
  )
}

/* ─── Main ─── */
export default function ProjectsScreen({ onAddProject: _onAddProject, onAddTask, onDetailChange }: ProjectsScreenProps) {
  const { projects, tasks: rawTasks, donIds } = useTaskStore()
  const [openProject, setOpenProject] = useState<Project | null>(null)

  useEffect(() => { onDetailChange?.(!!openProject) }, [openProject, onDetailChange])

  const stats = useMemo(() => {
    const m: Record<string, { total: number; done: number; inProgress: number; blocked: number }> = {}
    for (const p of projects) m[p.id] = { total: 0, done: 0, inProgress: 0, blocked: 0 }
    for (const t of rawTasks) {
      if (!t.project_id || !m[t.project_id]) continue
      const s = m[t.project_id]
      const done = donIds.has(t.id)
      s.total++
      if (done) s.done++
      else if (t.status === 'in_progress') s.inProgress++
      else if (t.status === 'blocked') s.blocked++
    }
    return m
  }, [projects, rawTasks, donIds])

  const totalTasks = useMemo(() => rawTasks.filter(t => !!t.project_id).length, [rawTasks])
  const visibleProjects = projects.filter(p => !p.is_archived)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '8px 22px 14px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ font: '300 34px/1 var(--font-sans)', color: '#F0ECE3', letterSpacing: '-0.01em' }}>Projects</div>
          <div style={{ font: '400 12px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.4)', marginTop: 7 }}>{visibleProjects.length} project{visibleProjects.length !== 1 ? 's' : ''} · {totalTasks} task{totalTasks !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px', background: '#2D2926', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 999 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
          <span style={{ font: '500 12px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.6)' }}>All</span>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px', paddingBottom: 120 }}>
        {visibleProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'rgba(255,255,255,0.4)', font: '400 13.5px/1.2 var(--font-sans)' }}>
            No projects yet. Tap + to create one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {visibleProjects.map(p => (
              <ProjectCard key={p.id} project={p} stats={stats[p.id] ?? { total: 0, done: 0, inProgress: 0, blocked: 0 }} onTap={() => setOpenProject(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail */}
      {openProject && (
        <ProjectDetailView
          project={openProject}
          onBack={() => setOpenProject(null)}
          onAddTask={onAddTask}
        />
      )}
    </div>
  )
}
