import { useState, useRef, useEffect, useCallback } from 'react'
import { sendMessage, type ChatMessage } from '../services/aiService'
import { useTaskStore } from '../store/taskStore'

interface AddedTask { title: string; task_date: string; task_time: string | null }

interface Message {
  role: 'user' | 'assistant'
  content: string
  addedTask?: AddedTask
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

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

const SUGGESTIONS = [
  'Встреча завтра в 10:00',
  'Позвонить маме в пятницу',
  'Тренировка сегодня в 19:00',
]

export default function AssistantScreen() {
  const { addTask } = useTaskStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! Tell me what to add to your calendar — for example: \"Meeting with Alex on Monday at 3pm\" or \"сегодня в 16:00 встреча с Мишей\"." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const streamRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const interimRef = useRef('')

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight
  }, [messages, loading])

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

      const { reply, parsedTask } = await sendMessage(history, msg)

      if (parsedTask) {
        await addTask({
          title: parsedTask.title,
          task_date: parsedTask.task_date,
          task_time: parsedTask.task_time,
          task_time_end: null,
          is_all_day: false,
          description: parsedTask.description,
        })
        setMessages(prev => [...prev, {
          role: 'assistant', content: reply,
          addedTask: { title: parsedTask.title, task_date: parsedTask.task_date, task_time: parsedTask.task_time },
        }])
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

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

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
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [listening])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', height: '100%' }}>
      {/* Hero header */}
      <div style={{ padding: '28px 24px 12px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.025em', color: 'var(--text)', whiteSpace: 'pre-line' }}>
          {getGreeting()}.{'\n'}What's <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>on your mind</em>?
        </div>
      </div>

      {/* Messages */}
      <div ref={streamRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '6px' }}>
            <div style={{
              padding: '12px 16px', wordBreak: 'break-word',
              maxWidth: '80%',
              borderRadius: m.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
              background: m.role === 'user' ? 'var(--text)' : 'var(--surface)',
              color: m.role === 'user' ? 'var(--bg)' : 'var(--text)',
              font: '400 14px/1.5 var(--font-sans)',
              letterSpacing: '-0.005em',
              boxShadow: m.role === 'assistant' ? 'var(--card-shadow)' : 'none',
            }}>
              {m.content}
            </div>
            {/* Action bubble for added tasks */}
            {m.addedTask && (
              <div style={{
                maxWidth: '80%', padding: '12px 14px', borderRadius: '16px',
                border: '1.5px solid var(--accent-soft)', background: 'var(--bg-2)',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 450, color: 'var(--text-2)', marginBottom: '8px' }}>
                  Added to your calendar.
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 550, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.addedTask.title}</div>
                    <div style={{ fontSize: '11.5px', fontWeight: 450, color: 'var(--text-muted)', marginTop: '2px' }}>
                      {m.addedTask.task_date}{m.addedTask.task_time ? ' · ' + m.addedTask.task_time.slice(0,5) : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ padding: '14px 16px', borderRadius: '20px 20px 20px 6px', background: 'var(--surface)', boxShadow: 'var(--card-shadow)', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              {[0, 0.18, 0.36].map((delay, i) => (
                <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', animation: `blink 1.2s ${delay}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      <div style={{ display: 'flex', gap: '8px', padding: '4px 18px 10px', overflowX: 'auto', flexShrink: 0 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => handleSend(s)} disabled={loading}
            style={{ flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '999px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 500, color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div style={{ margin: '6px 14px', marginBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 10px) + 72px)', borderRadius: '24px', background: 'var(--surface)', padding: '6px 6px 6px 18px', boxShadow: 'var(--card-shadow)', display: 'flex', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
        <textarea
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Add a task to your calendar..."
          disabled={loading}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--text)', fontFamily: 'inherit', fontSize: '14px', fontWeight: 400, lineHeight: 1.5, padding: '12px 0', maxHeight: '80px', minHeight: '24px' }}
        />
        {hasSpeechAPI && (
          <button onClick={toggleListening}
            style={{ width: '38px', height: '38px', borderRadius: '50%', border: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: listening ? 'var(--accent-soft)' : 'var(--surface2)', color: listening ? 'var(--accent)' : 'var(--text-2)', transition: 'all 0.15s', animation: listening ? 'micPulse 1.4s ease-in-out infinite' : 'none' }}>
            <MicIcon />
          </button>
        )}
        <button onClick={() => handleSend()} disabled={!input.trim() || loading}
          style={{ width: '38px', height: '38px', borderRadius: '50%', border: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: input.trim() && !loading ? 'var(--text)' : 'var(--surface2)', color: input.trim() && !loading ? 'var(--bg)' : 'var(--text-muted)', transition: 'all 0.15s', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed' }}>
          <SendIcon />
        </button>
      </div>
    </div>
  )
}
