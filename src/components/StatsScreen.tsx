import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTaskStore } from '../store/taskStore'

interface Props {
  onClose: () => void
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function startOfWeekMonday(d: Date): Date {
  const r = new Date(d)
  const dow = (r.getDay() + 6) % 7
  r.setDate(r.getDate() - dow)
  r.setHours(12, 0, 0, 0)
  return r
}

export default function StatsScreen({ onClose }: Props) {
  const { tasks, projects, habits, habitLogs, donIds } = useTaskStore()

  const { weekBars, weekDone, weekTotal, weekRate } = useMemo(() => {
    const today = new Date()
    const weekStart = startOfWeekMonday(today)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
    })
    let done = 0
    let total = 0
    const bars = days.map(d => {
      const dk = dayKey(d)
      const dayTasks = tasks.filter(t => t.task_date === dk)
      const dayDone = dayTasks.filter(t => donIds.has(t.id)).length
      done += dayDone
      total += dayTasks.length
      return { dk, count: dayDone, total: dayTasks.length, isFuture: dk > dayKey(today) }
    })
    return { weekBars: bars, weekDone: done, weekTotal: total, weekRate: total > 0 ? Math.round(done / total * 100) : 0 }
  }, [tasks, donIds])

  const maxBar = Math.max(1, ...weekBars.map(b => b.count))

  const habitHeat = useMemo(() => {
    const today = new Date()
    const days = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (27 - i)); return d
    })
    return habits.map(h => {
      let streak = 0
      const dRun = new Date(today)
      while (habitLogs.some(l => l.habit_id === h.id && l.completed_date === dayKey(dRun))) {
        streak++
        dRun.setDate(dRun.getDate() - 1)
      }
      const cells = days.map(d => ({
        dk: dayKey(d),
        done: habitLogs.some(l => l.habit_id === h.id && l.completed_date === dayKey(d)),
      }))
      return { habit: h, streak, cells }
    })
  }, [habits, habitLogs])

  const projectStats = useMemo(() => {
    return projects
      .filter(p => !p.is_archived)
      .map(p => {
        const pTasks = tasks.filter(t => t.project_id === p.id)
        const done = pTasks.filter(t => donIds.has(t.id)).length
        return { project: p, total: pTasks.length, done, pct: pTasks.length > 0 ? Math.round(done / pTasks.length * 100) : 0 }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
  }, [projects, tasks, donIds])

  const sectionLabel: React.CSSProperties = {
    font: '600 10px/1 var(--font-sans)', letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12,
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 500,
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 20px)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', font: '500 14px/1 var(--font-sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >← You</button>
        <h1 style={{ font: '600 15px/1 var(--font-sans)', color: 'var(--text)', letterSpacing: '-0.01em' }}>Stats</h1>
        <span style={{ width: 40 }} />
      </div>

      {/* Scroll body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 90px' }}>
        {/* Tasks section */}
        <div style={sectionLabel}>Tasks this week</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ font: '600 26px/1 var(--font-sans)', color: 'var(--success)' }}>{weekDone}</span>
            <span style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--text-muted)' }}>
              of {weekTotal} completed
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, borderRadius: 999, background: 'var(--surface2)', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ width: `${weekRate}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.4s' }} />
          </div>
          <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 10 }}>
            Completion rate: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{weekRate}%</span>
          </div>
          {/* Bar chart */}
          <svg width="100%" height="80" viewBox="0 0 210 80" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
            {weekBars.map((b, i) => {
              const barX = i * 30 + 5
              const barW = 20
              const h = (b.count / maxBar) * 60
              const y = 66 - h
              return (
                <g key={b.dk}>
                  <rect
                    x={barX} y={h > 0 ? y : 64}
                    width={barW} height={h > 0 ? h : 2}
                    rx={3}
                    fill={b.isFuture ? 'var(--surface2)' : 'var(--accent)'}
                    opacity={b.isFuture ? 0.4 : 1}
                  />
                  <text
                    x={barX + barW / 2} y={78}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="var(--text-muted)"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >{WEEKDAY_LABELS[i]}</text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Habits section */}
        <div style={sectionLabel}>Habits · last 28 days</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {habitHeat.length === 0 && (
            <div style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--text-muted)', padding: '4px 0' }}>
              No habits yet.
            </div>
          )}
          {habitHeat.map(({ habit, streak, cells }) => (
            <div key={habit.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: habit.color + '26',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, lineHeight: 1, flexShrink: 0,
                }}>
                  {habit.icon && habit.icon !== 'circle' ? habit.icon : '⭕'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</div>
                </div>
                {streak > 0 && (
                  <span style={{ font: '600 11px/1 var(--font-sans)', color: streak >= 7 ? '#E8A24A' : 'var(--text-2)', flexShrink: 0 }}>
                    🔥 {streak}
                  </span>
                )}
              </div>
              {/* Heatmap 4×7 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', gap: 4 }}>
                {cells.map((c, i) => (
                  <div key={i} style={{
                    aspectRatio: '1',
                    borderRadius: 4,
                    background: c.done ? habit.color : 'var(--surface2)',
                    opacity: c.done ? 1 : 0.5,
                  }} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Projects section */}
        <div style={sectionLabel}>Top projects</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projectStats.length === 0 && (
            <div style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--text-muted)', padding: '4px 0' }}>
              No active projects.
            </div>
          )}
          {projectStats.map(({ project, total, done, pct }) => (
            <div key={project.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, font: '600 13px/1.2 var(--font-sans)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {project.name}
                </div>
                <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--text-2)', flexShrink: 0 }}>{pct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: 'var(--surface2)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: project.color, transition: 'width 0.4s' }} />
              </div>
              <div style={{ font: '400 10.5px/1 var(--font-sans)', color: 'var(--text-muted)', marginTop: 6 }}>
                {done} of {total} done
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
