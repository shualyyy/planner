import { useState, useRef, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { sendMessage, type ChatMessage, type ParsedAction, type TaskSummary, type ProjectSummary } from '../services/aiService'
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

// ── Action icon ───────────────────────────────────────────────────────────

function ActionIcon({ type }: { type: ParsedAction['type'] }) {
  const p = {
    width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'var(--accent)' as string, strokeWidth: '2',
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (type) {
    case 'add':
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
    case 'delete':
      return <svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
    case 'reschedule':
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="17 13 13 17 11 15"/></svg>
    case 'done':
      return <svg {...p}><path d="M20 6L9 17l-5-5"/></svg>
    case 'undone':
      return <svg {...p}><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 010 8h-1"/></svg>
    case 'edit':
      return <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    default:
      return <svg {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  }
}

// ── Action bubble ─────────────────────────────────────────────────────────

function ActionBubble({ meta }: { meta: ActionMeta }) {
  const labelMap: Record<string, string> = {
    add: 'Added to calendar',
    delete: 'Deleted',
    reschedule: 'Rescheduled',
    done: 'Marked as done',
    undone: 'Unmarked',
    edit: 'Task updated',
    list: 'Task list',
    set_status: 'Status updated',
    set_priority: 'Priority updated',
    set_project: 'Assigned to project',
  }

  return (
    <div style={{
      maxWidth: '80%', padding: '12px 14px', borderRadius: '16px',
      border: '1.5px solid var(--accent-soft)', background: 'var(--bg-2)',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 450, color: 'var(--text-2)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          width: 24, height: 24, borderRadius: 7,
          background: 'var(--accent-soft)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ActionIcon type={meta.type} />
        </span>
        {labelMap[meta.type] ?? 'Done'}
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
  const { tasks, donIds, projects, addTask, deleteTask, updateTask, toggleDone, fetchTasks } = useTaskStore()

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hey! I can add, move, complete, and organize your tasks. I also know your projects — just tell me what to do.' },
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false)

  // Evaluated post-mount: on some iOS Safari versions the Speech API
  // registers on window only after first user interaction
  useEffect(() => {
    setHasSpeechAPI(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  const streamRef      = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const interimRef     = useRef('')

  // Auto-scroll on new message
  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight
  }, [messages, loading])

  // Task & project context for AI
  const taskSummaries: TaskSummary[] = tasks.map(t => ({
    id: t.id,
    title: t.title,
    task_date: t.task_date,
    task_time: t.task_time,
    is_done: donIds.has(t.id),
    status: t.status ?? null,
    priority: t.priority ?? null,
    project_id: t.project_id ?? null,
  }))

  const projectSummaries: ProjectSummary[] = projects.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    is_archived: p.is_archived,
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

      const { reply, action } = await sendMessage(history, msg, taskSummaries, projectSummaries)

      if (action) {
        await executeAction(action)
        const meta = buildActionMeta(action)
        setMessages(prev => [...prev, { role: 'assistant', content: reply, actionMeta: meta }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }])
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

      case 'set_status':
        if (!action.task_id || !action.new_status) break
        await updateTask(action.task_id, { status: action.new_status as import('../services/supabase').TaskStatus })
        break

      case 'set_priority':
        if (!action.task_id || !action.new_priority) break
        await updateTask(action.task_id, { priority: action.new_priority as import('../services/supabase').TaskPriority })
        break

      case 'set_project':
        if (!action.task_id) break
        await updateTask(action.task_id, { project_id: action.new_project_id ?? null })
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
        return { type: 'list', label: `${tasks.length} tasks` }
      case 'set_status':
        return { type: 'set_status', label: action.task_title ?? '' }
      case 'set_priority':
        return { type: 'set_priority', label: action.task_title ?? '' }
      case 'set_project':
        return { type: 'set_project', label: action.task_title ?? '' }
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
    recognition.lang = 'en-US'
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
      setInput(prev => {
        const prevInterim = interimRef.current
        const base = prevInterim ? prev.replace(prevInterim, '').trimEnd() : prev
        const appended = final || interim
        interimRef.current = final ? '' : interim
        return appended ? (base ? base + ' ' + appended : appended) : base
      })
    }
    recognition.onerror = () => setListening(false)
    recognition.onend   = () => setListening(false)
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
    } catch (err) {
      console.error('Speech recognition start failed:', err)
      setListening(false)
    }
  }, [listening, hasSpeechAPI])

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

      {/* Quick-prompt chips — only on empty chat */}
      {messages.length === 1 && !loading && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 18px 14px', flexShrink: 0 }}>
          {["What's today?", "Show overdue", "Add a task"].map(prompt => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              style={{
                padding: '8px 14px', borderRadius: 999,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-2)', font: '500 12px/1.2 var(--font-sans)',
                cursor: 'pointer', flexShrink: 0, letterSpacing: '-0.01em',
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div style={{ margin: '0 14px', marginBottom: 'calc(74px + env(safe-area-inset-bottom, 0px) + 16px)', position: 'relative', flexShrink: 0 }}>
        {/* Input bar */}
        <div style={{
          borderRadius: '24px',
          background: 'var(--surface)',
          padding: '6px 6px 6px 16px',
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
            placeholder={loading ? 'Thinking…' : 'Message AI…'}
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
