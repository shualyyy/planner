import { useMemo } from 'react'
import type { Task } from '../services/supabase'
import { CheckIcon } from './icons'

interface WinsScreenProps {
  tasks: (Task & { done: boolean })[]
}

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

const WD1 = ['S','M','T','W','T','F','S']

export default function WinsScreen({ tasks }: WinsScreenProps) {
  const today = useMemo(() => new Date(), [])

  const { streak, last7, weekDone, weekTotal } = useMemo(() => {
    // Streak: consecutive days ending today with ≥1 done task
    let streak = 0
    let day = new Date(today)
    while (true) {
      const dk = dayKey(day)
      const hasDone = tasks.some(t => t.task_date === dk && t.done)
      if (!hasDone) break
      streak++
      day = addDays(day, -1)
    }

    // Last 7 days
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, -(6 - i))
      const dk = dayKey(d)
      const dayTasks = tasks.filter(t => t.task_date === dk)
      const done = dayTasks.filter(t => t.done).length
      return { day: d, done, total: dayTasks.length, dk }
    })

    const weekDone = last7.reduce((s, d) => s + d.done, 0)
    const weekTotal = last7.reduce((s, d) => s + d.total, 0)

    return { streak, last7, weekDone, weekTotal }
  }, [tasks, today])

  const maxBar = Math.max(...last7.map(d => d.total), 1)
  const todayKey = dayKey(today)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflowY: 'auto', paddingBottom: '70px' }}>
      {/* Header */}
      <div style={{ padding: '28px 24px 0' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--accent)', marginBottom: '10px' }}>
          Your week
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: '10px' }}>
          A quiet kind of <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>winning.</em>
        </h1>
        <p style={{ fontSize: '14px', fontWeight: 450, color: 'var(--text-2)', lineHeight: 1.5 }}>
          {weekDone} task{weekDone !== 1 ? 's' : ''} done, {weekTotal - weekDone} still in the pipeline.
        </p>
      </div>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Streak card */}
        <div style={{ background: 'var(--surface)', borderRadius: '22px', padding: '24px', boxShadow: 'var(--card-shadow)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'var(--accent-soft)', opacity: 0.5, filter: 'blur(20px)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '64px', fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1 }}>{streak}</span>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', fontWeight: 500, color: 'var(--text-2)' }}>days</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-2)' }}>Current streak</div>
          </div>
        </div>

        {/* Weekly bar chart */}
        <div style={{ background: 'var(--surface)', borderRadius: '22px', padding: '22px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Last 7 days</span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-2)' }}>{weekDone}/{weekTotal} done</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', alignItems: 'flex-end' }}>
            {last7.map(({ day, done, total, dk }) => {
              const isToday = dk === todayKey
              const pct = total > 0 ? done / total : 0
              const barH = total === 0 ? 4 : Math.max(pct * 60, 6)
              return (
                <div key={dk} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '100%', height: '60px', background: 'var(--surface2)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      width: '100%', height: `${barH}px`,
                      background: total === 0 ? 'var(--border)' : 'linear-gradient(180deg, var(--accent-2), var(--accent))',
                      borderRadius: '6px',
                      boxShadow: isToday ? '0 0 16px var(--accent-glow)' : 'none',
                      transition: 'height 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {WD1[day.getDay()]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent wins */}
        <div style={{ background: 'var(--surface)', borderRadius: '22px', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
          {[
            { bg: 'var(--accent-soft)', icon: '🔥', title: 'Best week so far', meta: 'Highest completion rate in 30 days' },
            { bg: 'var(--success-soft)', icon: null, title: 'Morning routine kept', meta: '5 days in a row', isCheck: true },
            { bg: 'var(--accent-soft)', icon: '✦', title: 'Keep going', meta: "You're building momentum" },
          ].map((row, i) => (
            <div key={i}>
              {i > 0 && <div style={{ borderTop: '1px solid var(--hairline)' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: row.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
                  {row.isCheck
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    : row.icon}
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 550, color: 'var(--text)' }}>{row.title}</div>
                  <div style={{ fontSize: '12px', fontWeight: 450, color: 'var(--text-muted)', marginTop: '2px' }}>{row.meta}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  void maxBar
  void CheckIcon
}
