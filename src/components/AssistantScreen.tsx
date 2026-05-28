import { useState, useRef, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { sendMessage, type ChatMessage, type ParsedAction, type TaskSummary } from '../services/aiService'
import { useTaskStore } from '../store/taskStore'

// ── Action bubble metadata ────────────────────────────────────────────────

interface ActionMeta {
  type: ParsedAction['type']
  label: string
  date?: string
  time?: string | null
  newDate?: string
  newTime?: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  actionMeta?: ActionMeta
}

// ── Web Speech API types ──────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event { error: string }
interface SpeechRecognitionInstance extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean
  start(): void; stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror:  ((e: SpeechRecognitionErrorEvent) => void) | null
  onend:    (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

// ── Icons ─────────────────────────────────────────────────────────────────

const MicIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l14-7-7 14-2-5-5-2z" />
  </svg>
)

// ── Dino mascot ───────────────────────────────────────────────────────────

const DinoMascot = () => (
  <img
    src="/dino.png"
    alt="Dino"
    width={56}
    height={56}
    style={{ display: 'block', imageRendering: 'pixelated' }}
  />
)

// ── Action icon ───────────────────────────────────────────────────────────

function ActionIcon({ type }: { type: ParsedAction['type'] }) {
  const icons: Record<string, string> = {
    add: '📅', delete: '🗑️', reschedule: '📆',
    done: '✅', undone: '↩️', edit: '✏️', list: '📋',
  }
  return <span style={{ fontSize: '16px' }}>{icons[type] ?? '✓'}</span>
}

// ── Action bubble ─────────────────────────────────────────────────────────

function ActionBubble({ meta }: { meta: ActionMeta }) {
  const labelMap: Record<string, string> = {
    add: 'Добавлено в календарь',
    delete: 'Удалено из календаря',
    reschedule: 'Перенесено',
    done: 'Отмечено выполненным',
    undone: 'Отметка снята',
    edit: 'Задача обновлена',
    list: 'Список задач',
  }

  return (
    <div style={{
      maxWidth: '80%', padding: '12px 14px', borderRadius: '16px',
      border: '1.5px solid var(--accent-soft)', background: 'var(--bg-2)',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 450, color: 'var(--text-2)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ActionIcon type={meta.type} />
        {labelMap[meta.type] ?? 'Готово'}
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)', flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 550, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta.label}
          </div>
          {(meta.date || meta.newDate) && (
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {meta.type === 'reschedule' && meta.newDate
                ? `→ ${meta.newDate}${meta.newTime ? ' · ' + meta.newTime.slice(0, 5) : ''}`
                : meta.date
                  ? `${meta.date}${meta.time ? ' · ' + meta.time.slice(0, 5) : ''}`
                  : null
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      <div style={{ padding: '14px 16px', borderRadius: '20px 20px 20px 6px', background: 'var(--surface)', boxShadow: 'var(--card-shadow)', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
        {[0, 0.18, 0.36].map((delay, i) => (
          <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', animation: `blink 1.2s ${delay}s infinite ease-in-out` }} />
        ))}
      </div>
    </div>
  )
}

// ── Format date for bubble ────────────────────────────────────────────────

function fmtDate(d: string): string {
  try { return format(new Date(d + 'T12:00'), 'd MMM') } catch { return d }
}

// ── Main component ────────────────────────────────────────────────────────

export default function AssistantScreen() {
  const { tasks, donIds, addTask, deleteTask, updateTask, toggleDone, fetchTasks } = useTaskStore()

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Привет! Я Dino 🦕 Могу добавить, удалить, перенести или отметить выполненной любую задачу. Просто скажи!' },
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)

  const streamRef      = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const interimRef     = useRef('')

  // Auto-scroll on new message
  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight
  }, [messages, loading])

  // Task context for AI
  const taskSummaries: TaskSummary[] = tasks.map(t => ({
    id: t.id,
    title: t.title,
    task_date: t.task_date,
    task_time: t.task_time,
    is_done: donIds.has(t.id),
  }))

  // ── Send message ──────────────────────────────────────────────────────

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)

    try {
      const history: ChatMessage[] = messages
        .slice(1)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const { reply, action } = await sendMessage(history, msg, taskSummaries)

      if (action) {
        await executeAction(action)
        const meta = buildActionMeta(action)
        setMessages(prev => [...prev, { role: 'assistant', content: reply, actionMeta: meta }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err)
      setMessages(prev => [...prev, { role: 'assistant', content: `Ошибка: ${errMsg}` }])
    } finally {
      setLoading(false)
    }
  }

  // ── Execute action in store ───────────────────────────────────────────

  async function executeAction(action: ParsedAction) {
    switch (action.type) {
      case 'add':
        if (!action.title || !action.task_date) break
        await addTask({
          title: action.title,
          task_date: action.task_date,
          task_time: action.task_time ?? null,
          task_time_end: action.task_time_end ?? null,
          is_all_day: false,
          is_done: false,
          description: action.description ?? null,
        })
        break

      case 'delete':
        if (!action.task_id) break
        await deleteTask(action.task_id)
        break

      case 'reschedule':
        if (!action.task_id || !action.new_date) break
        await updateTask(action.task_id, {
          task_date: action.new_date,
          task_time: action.new_time ?? null,
        })
        break

      case 'done':
        if (!action.task_id) break
        if (!donIds.has(action.task_id)) await toggleDone(action.task_id)
        break

      case 'undone':
        if (!action.task_id) break
        if (donIds.has(action.task_id)) await toggleDone(action.task_id)
        break

      case 'edit':
        if (!action.task_id) break
        await updateTask(action.task_id, {
          ...(action.new_title ? { title: action.new_title } : {}),
          ...(action.new_description !== undefined ? { description: action.new_description ?? null } : {}),
        })
        break

      case 'list':
        break // AI replies with text, no store action
    }

    // Refresh store after mutations
    if (action.type !== 'list') await fetchTasks()
  }

  // ── Build action bubble meta ──────────────────────────────────────────

  function buildActionMeta(action: ParsedAction): ActionMeta {
    switch (action.type) {
      case 'add':
        return {
          type: 'add',
          label: action.title ?? '',
          date: action.task_date ? fmtDate(action.task_date) : undefined,
          time: action.task_time,
        }
      case 'delete':
        return { type: 'delete', label: action.task_title ?? '' }
      case 'reschedule':
        return {
          type: 'reschedule',
          label: action.task_title ?? '',
          newDate: action.new_date ? fmtDate(action.new_date) : undefined,
          newTime: action.new_time,
        }
      case 'done':
        return { type: 'done', label: action.task_title ?? '' }
      case 'undone':
        return { type: 'undone', label: action.task_title ?? '' }
      case 'edit':
        return { type: 'edit', label: action.new_title ?? action.task_title ?? '' }
      case 'list':
        return { type: 'list', label: `${tasks.length} задач в календаре` }
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────────────

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Voice input ───────────────────────────────────────────────────────

  const toggleListening = useCallback(() => {
    if (!hasSpeechAPI) return
    if (listening) { recognitionRef.current?.stop(); return }

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition!
    const recognition = new SpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.continuous = true
    recognition.interimResults = true
    interimRef.current = ''

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      interimRef.current = interim
      setInput(prev => {
        const base = prev.replace(interimRef.current, '').trimEnd()
        const appended = final || interim
        return appended ? (base ? base + ' ' + appended : appended) : base
      })
      if (final) interimRef.current = ''
    }
    recognition.onerror = () => setListening(false)
    recognition.onend   = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [listening])

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', height: '100%' }}>

      {/* Messages */}
      <div
        ref={streamRef}
        style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '6px' }}>
            <div style={{
              padding: '12px 16px', wordBreak: 'break-word',
              maxWidth: '80%',
              borderRadius: m.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
              color: m.role === 'user' ? 'var(--accent-ink)' : 'var(--text)',
              font: '400 14px/1.5 var(--font-sans)',
              letterSpacing: '-0.005em',
              boxShadow: m.role === 'assistant' ? 'var(--card-shadow)' : 'none',
            }}>
              {m.content}
            </div>
            {m.actionMeta && <ActionBubble meta={m.actionMeta} />}
          </div>
        ))}

        {loading && <TypingDots />}
      </div>

      {/* Composer */}
      <div style={{ margin: '0 14px', marginBottom: '82px', position: 'relative', flexShrink: 0 }}>
        {/* Dino sitting on input bar */}
        <div style={{ position: 'absolute', bottom: '100%', left: '30px', marginBottom: '-6px', zIndex: 2, pointerEvents: 'none' }}>
          <DinoMascot />
        </div>

        {/* Input bar */}
        <div style={{
          borderRadius: '24px',
          background: 'var(--surface)',
          padding: '6px 6px 6px 76px',
          boxShadow: 'var(--card-shadow), 0 0 0 1px var(--border)',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
        }}>
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={loading ? 'Думаю…' : 'Напиши Dino…'}
            disabled={loading}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', color: 'var(--text)', fontFamily: 'inherit',
              fontSize: '14px', fontWeight: 400, lineHeight: 1.5,
              padding: '12px 0', maxHeight: '80px', minHeight: '24px',
            }}
          />
          {hasSpeechAPI && (
            <button
              onClick={toggleListening}
              style={{
                width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: listening ? 'var(--accent-soft)' : 'var(--surface2)',
                color: listening ? 'var(--accent)' : 'var(--text-2)',
                transition: 'all 0.15s',
                animation: listening ? 'micPulse 1.4s ease-in-out infinite' : 'none',
              }}
            >
              <MicIcon />
            </button>
          )}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{
              width: '38px', height: '38px', borderRadius: '50%', border: 'none',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface2)',
              color: input.trim() && !loading ? 'var(--accent-ink)' : 'var(--text-muted)',
              transition: 'all 0.15s',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
