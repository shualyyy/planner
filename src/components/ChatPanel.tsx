import { useState, useRef, useEffect, useCallback } from 'react'
import { sendMessage, type ChatMessage } from '../services/aiService'
import { useTaskStore } from '../store/taskStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
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

const SparkleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E89372" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9z" opacity="0.6" />
  </svg>
)

const SendIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l14-7-7 14-2-5-5-2z" />
  </svg>
)

const MicIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const SUGGESTIONS = [
  'Встреча завтра в 10:00',
  'Позвонить маме в пятницу',
  'Тренировка сегодня в 19:00',
]

export default function ChatPanel() {
  const { addTask } = useTaskStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! Tell me what to add to your calendar — for example: \"Meeting with Alex on Monday at 3pm\" or \"сегодня в 16:00 встреча с Мишей\"." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const streamRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const interimRef = useRef('')   // interim transcript accumulator

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

      // If AI extracted a task — save it immediately, no confirmation needed
      if (parsedTask) {
        await addTask({
          title: parsedTask.title,
          task_date: parsedTask.task_date,
          task_time: parsedTask.task_time,
          description: parsedTask.description,
        })
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleListening = useCallback(() => {
    if (!hasSpeechAPI) return

    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition!
    const recognition = new SpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.continuous = true
    recognition.interimResults = true
    interimRef.current = ''

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      interimRef.current = interim
      setInput(prev => {
        // Replace any previous interim with new interim/final
        const base = prev.replace(interimRef.current, '').trimEnd()
        const appended = final || interim
        return appended ? (base ? base + ' ' + appended : appended) : base
      })
      if (final) interimRef.current = ''
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [listening])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#131313', height: '100%', borderRight: '1px solid var(--border-soft)' }}>
      {/* Header */}
      <div style={{
        height: '56px', padding: '0 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-soft)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', fontWeight: 550, color: 'var(--text)' }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%', background: '#34d399',
            boxShadow: '0 0 0 3px rgba(52,211,153,0.15), 0 0 12px rgba(52,211,153,0.6)',
            display: 'inline-block',
          }} />
          AI Assistant
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Online</div>
      </div>

      {/* Messages */}
      <div ref={streamRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{
                width: '24px', height: '24px', borderRadius: '7px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #1f1f1f, #161616)',
                border: '1px solid #2a2a2a', marginTop: '2px',
              }}>
                <SparkleIcon />
              </div>
            )}
            <div style={{
              fontSize: '13px', lineHeight: 1.55, padding: '9px 12px',
              borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              maxWidth: '220px', wordBreak: 'break-word',
              background: m.role === 'user' ? 'var(--accent)' : '#1c1c1c',
              color: m.role === 'user' ? '#fff' : 'var(--text)',
              border: m.role === 'user' ? 'none' : '1px solid #262626',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #1f1f1f, #161616)', border: '1px solid #2a2a2a',
            }}>
              <SparkleIcon />
            </div>
            <div style={{
              padding: '12px', borderRadius: '12px 12px 12px 4px',
              background: '#1c1c1c', border: '1px solid #262626',
              display: 'inline-flex', gap: '4px', alignItems: 'center',
            }}>
              {[0, 0.18, 0.36].map((delay, i) => (
                <span key={i} style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: 'var(--text-muted)',
                  display: 'inline-block',
                  animation: `blink 1.2s ${delay}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      <div style={{ padding: '4px 18px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px', flexShrink: 0 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => handleSend(s)} disabled={loading} style={{
            fontSize: '11.5px', padding: '5px 10px', borderRadius: '999px',
            background: '#1a1a1a', border: '1px solid #262626',
            color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border-soft)', flexShrink: 0 }}>
        <div style={{
          background: '#1a1a1a', border: '1px solid #262626', borderRadius: '12px',
          display: 'flex', alignItems: 'flex-end', padding: '6px 6px 6px 12px',
        }}>
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Add a task to your calendar…"
            disabled={loading}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', color: 'var(--text)', fontFamily: 'inherit',
              fontSize: '13px', lineHeight: 1.5, padding: '6px 0', maxHeight: '80px',
            }}
          />
          {hasSpeechAPI && (
            <button
              onClick={toggleListening}
              title={listening ? 'Остановить запись' : 'Голосовой ввод'}
              style={{
                width: '28px', height: '28px', borderRadius: '8px', border: 'none',
                background: listening ? 'rgba(239,68,68,0.15)' : '#2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, marginRight: '4px',
                color: listening ? 'var(--danger)' : 'var(--text-muted)',
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
              width: '28px', height: '28px', borderRadius: '8px', border: 'none',
              background: input.trim() && !loading ? 'var(--accent)' : '#2a2a2a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              color: input.trim() && !loading ? '#fff' : 'var(--text-faint)',
              transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  )
}
