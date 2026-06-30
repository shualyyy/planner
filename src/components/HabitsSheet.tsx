import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Habit, HabitLog } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'

interface HabitsSheetProps {
  habits: Habit[]
  habitLogs: HabitLog[]
  onToggle: (habitId: string, date: string) => void
  onClose: () => void
}

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WD_EN = ['Mo','Tu','We','Th','Fr','Sa','Su']

const HABIT_COLORS = ['#e35914','#4A9EFF','#3DD68C','#A78BFA','#F5BDD0']

function startOfWeekMonday(d: Date): Date {
  const r = new Date(d)
  const dow = (r.getDay() + 6) % 7 // Mon=0
  r.setDate(r.getDate() - dow)
  r.setHours(12, 0, 0, 0)
  return r
}

function CheckSvg({ stroke = '#0A0A0F' }: { stroke?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4 4L19 7" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function HabitsSheet({ habits, habitLogs, onToggle, onClose }: HabitsSheetProps) {
  const { addHabit } = useTaskStore()
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(HABIT_COLORS[0])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showForm) setTimeout(() => inputRef.current?.focus(), 80)
  }, [showForm])

  const today = new Date()
  const todayKey = dayKey(today)
  const weekStart = startOfWeekMonday(today)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
  })

  const isLogged = (habitId: string, dk: string) =>
    habitLogs.some(l => l.habit_id === habitId && l.completed_date === dk)

  // Stats
  const streak = (() => {
    let s = 0
    const d = new Date(today)
    while (true) {
      const dk = dayKey(d)
      if (habitLogs.some(l => l.completed_date === dk)) { s++; d.setDate(d.getDate() - 1) }
      else break
    }
    return s
  })()

  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`
  const doneThisMonth = habitLogs.filter(l => l.completed_date.startsWith(monthPrefix)).length
  const totalThisMonth = habits.length * today.getDate()

  function habitStreak(habitId: string): number {
    let s = 0
    const d = new Date(today)
    while (isLogged(habitId, dayKey(d))) { s++; d.setDate(d.getDate() - 1) }
    return s
  }

  async function handleSave() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await addHabit({ name: newName.trim(), icon: 'circle', color: newColor, frequency: 'daily', time_of_day: 'morning' })
      setNewName('')
      setNewColor(HABIT_COLORS[0])
      setShowForm(false)
    } catch (e) { console.error(e) }
    setAdding(false)
  }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)' }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '85%',
          background: '#111118', borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Handle + header */}
        <div style={{ padding: '12px 22px 0', flexShrink: 0 }}>
          <div style={{ width: 38, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 18px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ font: '300 28px/1 Inter', color: '#F0ECE3' }}>Habits</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ font: '400 12px Inter', color: 'rgba(255,255,255,0.4)' }}>{MONTHS_EN[today.getMonth()]} {today.getFullYear()}</span>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: '#16161E', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scroll body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 32px' }}>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 9, marginBottom: 20 }}>
            {[
              { icon: '🔥', label: 'Streak', value: `${streak}d` },
              { icon: '✓',  label: 'Month',  value: `${doneThisMonth}/${totalThisMonth}` },
              { icon: '⚡', label: 'Active',  value: `${habits.length}` },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: '#16161E', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '11px 12px' }}>
                <div style={{ fontSize: 15, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ font: '600 16px Inter', color: '#F0ECE3' }}>{s.value}</div>
                <div style={{ font: '500 10px Inter', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Habit cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {habits.length === 0 && !showForm && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.4)', font: '400 13px Inter' }}>
                No habits yet. Add your first one!
              </div>
            )}
            {habits.map(h => {
              const doneToday = isLogged(h.id, todayKey)
              const freqLabel = h.frequency === 'daily' ? 'Daily' : 'Weekly'
              const todLabel = h.time_of_day === 'morning' ? 'Morning' : h.time_of_day === 'evening' ? 'Evening' : 'Afternoon'
              return (
                <div key={h.id} style={{ background: '#16161E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: h.color + '26', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={h.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 15px Inter', color: '#F0ECE3' }}>{h.name}</div>
                      <div style={{ font: '400 11px Inter', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{freqLabel} · {todLabel} · streak {habitStreak(h.id)}</div>
                    </div>
                    <button
                      onClick={() => onToggle(h.id, todayKey)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: doneToday ? h.color : 'transparent',
                        border: doneToday ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      {doneToday && <CheckSvg />}
                    </button>
                  </div>

                  {/* 7-day dot row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingLeft: 46 }}>
                    {weekDays.map((d, i) => {
                      const dk = dayKey(d)
                      const done = isLogged(h.id, dk)
                      const isToday = dk === todayKey
                      const isFuture = dk > todayKey
                      const isMiss = !done && !isFuture && !isToday
                      let style: React.CSSProperties = { width: 15, height: 15, borderRadius: 999, flexShrink: 0 }
                      if (done) style = { ...style, background: h.color }
                      else if (isToday) style = { ...style, border: `1.5px solid ${h.color}`, boxShadow: `0 0 0 3px ${h.color}2E` }
                      else if (isMiss) style = { ...style, background: 'rgba(255,92,92,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                      else style = { ...style, border: '1.5px solid rgba(255,255,255,0.15)' }
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={style}>
                            {isMiss && <span style={{ width: 5, height: 5, borderRadius: 999, background: '#FF5C5C' }} />}
                          </div>
                          <span style={{ font: '500 8px Inter', color: 'rgba(255,255,255,0.25)' }}>{WD_EN[i]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Inline add form */}
            {showForm ? (
              <div style={{ background: '#16161E', border: '1.5px solid rgba(227,89,20,0.3)', borderRadius: 16, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowForm(false) }}
                  placeholder="Habit name…"
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: '#F0ECE3', font: '500 15px Inter', width: '100%',
                    borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 8,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Color chips */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {HABIT_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        style={{
                          width: 22, height: 22, borderRadius: '50%', border: 'none',
                          background: c, cursor: 'pointer', flexShrink: 0,
                          boxShadow: newColor === c ? `0 0 0 2px #111118, 0 0 0 4px ${c}` : 'none',
                          transform: newColor === c ? 'scale(1.1)' : 'scale(1)',
                          transition: 'transform 0.12s, box-shadow 0.12s',
                        }}
                      />
                    ))}
                  </div>
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setShowForm(false); setNewName('') }}
                      style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', font: '500 12px Inter', border: 'none', cursor: 'pointer' }}
                    >Cancel</button>
                    <button
                      onClick={handleSave}
                      disabled={adding || !newName.trim()}
                      style={{
                        padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: newName.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                        color: newName.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                        font: '600 12px Inter', transition: 'all 0.15s',
                      }}
                    >{adding ? '…' : 'Add'}</button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  height: 48, border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 14,
                  background: 'transparent', color: 'rgba(255,255,255,0.6)', font: '500 13px Inter',
                  cursor: 'pointer', marginTop: 4,
                }}
              >+ Add habit</button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
