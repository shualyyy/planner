import { useState } from 'react'
import { supabase } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'

interface Props {
  onComplete: () => void
}

const HABIT_ICONS = ['⭕', '🏃', '📚', '💧', '🧘', '💪', '🥗', '✍️']

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { addTask, addHabit, fetchProfile } = useTaskStore()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)

  // Step 0
  const [name, setName] = useState('')

  // Step 1
  const [taskTitle, setTaskTitle] = useState('')
  const [taskWhen, setTaskWhen] = useState<'today' | 'tomorrow'>('today')

  // Step 2
  const [habitName, setHabitName] = useState('')
  const [habitIcon, setHabitIcon] = useState(HABIT_ICONS[0])

  async function finish() {
    setFinishing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_profiles').update({
        onboarded: true,
        ...(name.trim() ? { display_name: name.trim() } : {}),
      }).eq('id', user.id)
    }
    await fetchProfile()
    setTimeout(() => onComplete(), 450) // let pulse animation play
  }

  async function handleStep0() {
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_profiles').update({ display_name: name.trim() }).eq('id', user.id)
    }
    await fetchProfile()
    setSaving(false)
    setStep(1)
  }

  async function handleStep1Add() {
    if (!taskTitle.trim()) return
    setSaving(true)
    try {
      const d = taskWhen === 'today' ? new Date() : (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t })()
      await addTask({
        title: taskTitle.trim(),
        task_date: fmtDate(d),
        task_time: null,
        task_time_end: null,
        is_all_day: false,
        is_done: false,
        description: null,
      })
    } catch (e) { console.error(e) }
    setSaving(false)
    setStep(2)
  }

  async function handleStep2Add() {
    if (!habitName.trim()) return
    setSaving(true)
    try {
      await addHabit({
        name: habitName.trim(),
        icon: habitIcon,
        color: '#D97757',
        frequency: 'daily',
        time_of_day: 'morning',
      })
    } catch (e) { console.error(e) }
    setSaving(false)
    finish()
  }

  const wrap: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'var(--bg)',
    display: 'flex', flexDirection: 'column', zIndex: 1000,
    paddingTop: 'env(safe-area-inset-top, 24px)',
    paddingBottom: 'env(safe-area-inset-bottom, 20px)',
    color: 'var(--text)',
  }
  const primaryBtn = (enabled: boolean): React.CSSProperties => ({
    width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: enabled ? 'pointer' : 'not-allowed',
    background: enabled ? 'var(--accent)' : 'var(--surface2)',
    color: enabled ? '#fff' : 'var(--text-muted)',
    font: '600 15px/1 var(--font-sans)', letterSpacing: '-0.01em',
    boxShadow: enabled ? '0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px var(--accent-glow)' : 'none',
    transition: 'all 0.15s',
  })
  const skipBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', font: '500 13px/1 var(--font-sans)', padding: '10px 0',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '16px 18px',
    color: 'var(--text)', font: '500 16px/1.2 var(--font-sans)',
    outline: 'none', boxSizing: 'border-box',
  }
  const dotRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16,
  }

  return (
    <div style={wrap}>
      {/* Progress dots */}
      <div style={{ ...dotRow, padding: '20px 24px 0' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: i === step ? 22 : 8, height: 8, borderRadius: 999,
            background: i <= step ? 'var(--accent)' : 'var(--surface2)',
            transition: 'width 0.25s ease, background 0.25s ease',
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
        {step === 0 && (
          <>
            <div style={{ font: '300 32px/1.15 var(--font-sans)', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Welcome to <span style={{ color: 'var(--accent)' }}>Planer</span>
            </div>
            <div style={{ font: '400 15px/1.5 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 32 }}>
              Your personal task &amp; habit system.
            </div>
            <div style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              What&apos;s your name?
            </div>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              onKeyDown={e => { if (e.key === 'Enter') handleStep0() }}
              style={inputStyle}
            />
          </>
        )}

        {step === 1 && (
          <>
            <div style={{ font: '300 28px/1.15 var(--font-sans)', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Add your first task
            </div>
            <div style={{ font: '400 14px/1.5 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 24 }}>
              Something small you want to get done.
            </div>
            <input
              autoFocus
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="e.g. Reply to Alex"
              onKeyDown={e => { if (e.key === 'Enter') handleStep1Add() }}
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {(['today', 'tomorrow'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setTaskWhen(v)}
                  style={{
                    flex: 1, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: taskWhen === v ? 'var(--accent-soft)' : 'var(--surface2)',
                    color: taskWhen === v ? 'var(--accent)' : 'var(--text-muted)',
                    font: '600 13px/1 var(--font-sans)', textTransform: 'capitalize',
                    outline: taskWhen === v ? '1.5px solid var(--accent)' : 'none',
                  }}
                >{v}</button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ font: '300 28px/1.15 var(--font-sans)', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Build your first habit
            </div>
            <div style={{ font: '400 14px/1.5 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 24 }}>
              Small daily wins add up.
            </div>
            <input
              autoFocus
              value={habitName}
              onChange={e => setHabitName(e.target.value)}
              placeholder="e.g. Drink water"
              onKeyDown={e => { if (e.key === 'Enter') handleStep2Add() }}
              style={{ ...inputStyle, marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {HABIT_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setHabitIcon(ic)}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                    fontSize: 20, lineHeight: 1, flexShrink: 0,
                    background: habitIcon === ic ? 'var(--accent-soft)' : 'var(--surface2)',
                    outline: habitIcon === ic ? '1.5px solid var(--accent)' : 'none',
                  }}
                >{ic}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {step === 0 && (
          <button disabled={saving || !name.trim()} onClick={handleStep0} style={primaryBtn(!!name.trim() && !saving)}>
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        )}
        {step === 1 && (
          <>
            <button disabled={saving || !taskTitle.trim()} onClick={handleStep1Add} style={primaryBtn(!!taskTitle.trim() && !saving)}>
              {saving ? 'Adding…' : 'Add & Continue'}
            </button>
            <button onClick={() => setStep(2)} style={skipBtn}>Skip</button>
          </>
        )}
        {step === 2 && (
          <>
            <button disabled={saving || !habitName.trim() || finishing} onClick={handleStep2Add} style={primaryBtn(!!habitName.trim() && !saving && !finishing)}>
              {saving || finishing ? 'Starting…' : 'Start tracking'}
            </button>
            <button disabled={finishing} onClick={finish} style={skipBtn}>Skip</button>
          </>
        )}
      </div>

      {/* Pulse celebration */}
      {finishing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadein 0.15s ease',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 0 0 var(--accent-glow)',
            animation: 'ping 1s ease-out',
          }} />
        </div>
      )}

      <style>{`
        @keyframes fadein { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
