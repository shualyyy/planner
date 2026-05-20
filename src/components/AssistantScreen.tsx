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

/* ── Dino mascot — pixel-art style T-Rex ── */
const DinoMascot = () => (
  <svg
    width="52" height="60"
    viewBox="0 0 52 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ animation: 'dinoFloat 3s ease-in-out infinite', display: 'block' }}
  >
    {/* Back spikes */}
    <rect x="28" y="1"  width="5" height="9"  rx="2.5" fill="#2BAB78"/>
    <rect x="22" y="6"  width="4" height="7"  rx="2"   fill="#2BAB78"/>
    <rect x="17" y="10" width="3.5" height="6" rx="1.75" fill="#2BAB78"/>

    {/* Head */}
    <rect x="22" y="7"  width="18" height="17" rx="7" fill="#3CC68A"/>
    {/* Snout */}
    <rect x="36" y="17" width="14" height="10" rx="5" fill="#3CC68A"/>
    {/* Nostril */}
    <rect x="46" y="19" width="2.5" height="2.5" rx="1.25" fill="#2BAB78"/>
    {/* Eye */}
    <circle cx="37" cy="13" r="3.5" fill="#06141B"/>
    <circle cx="38" cy="12" r="1.2" fill="#CCD0CF"/>

    {/* Neck */}
    <rect x="20" y="20" width="16" height="8" rx="4" fill="#3CC68A"/>

    {/* Body */}
    <rect x="6" y="22" width="28" height="24" rx="9" fill="#3CC68A"/>

    {/* Belly (lighter) */}
    <rect x="10" y="27" width="16" height="15" rx="6" fill="#2BAB78"/>

    {/* Tail */}
    <path d="M6 36 C0 34, -2 40, 4 42" stroke="#3CC68A" strokeWidth="7" strokeLinecap="round" fill="none"/>

    {/* Arm (small) */}
    <rect x="32" y="34" width="9" height="5" rx="2.5" fill="#3CC68A"/>
    <rect x="38" y="37" width="5" height="3.5" rx="1.75" fill="#2BAB78"/>

    {/* Left leg */}
    <rect x="9"  y="42" width="10" height="12" rx="5" fill="#3CC68A"/>
    {/* Right leg */}
    <rect x="22" y="42" width="10" height="12" rx="5" fill="#3CC68A"/>

    {/* Left foot */}
    <rect x="7"  y="51" width="13" height="5" rx="2.5" fill="#2BAB78"/>
    {/* Right foot */}
    <rect x="20" y="51" width="13" height="5" rx="2.5" fill="#2BAB78"/>
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
    { role: 'assistant', content: "Привет! Я Dino 🦕 Скажи мне что добавить в календарь — например: «Встреча с Мишей в понедельник в 15:00»." },
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
      setMessages(prev => [...prev, { role: 'assistant', content: `Ошибка: ${errMsg}` }])
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

      {/* Messages */}
      <div ref={streamRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
            {/* Action bubble for added tasks */}
            {m.addedTask && (
              <div style={{
                maxWidth: '80%', padding: '12px 14px', borderRadius: '16px',
                border: '1.5px solid var(--accent-soft)', background: 'var(--bg-2)',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 450, color: 'var(--text-2)', marginBottom: '8px' }}>
                  Добавлено в календарь.
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

      {/* Composer with Dino mascot */}
      <div style={{ margin: '0 14px', marginBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 10px) + 72px)', position: 'relative', flexShrink: 0 }}>
        {/* Dino standing on top of input bar */}
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '10px',
          marginBottom: '-6px',
          zIndex: 2,
          pointerEvents: 'none',
        }}>
          <DinoMascot />
        </div>

        {/* Input bar */}
        <div style={{
          borderRadius: '24px',
          background: 'var(--surface)',
          padding: '6px 6px 6px 72px',
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
            placeholder="Скажи Dino что запланировать..."
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
            style={{ width: '38px', height: '38px', borderRadius: '50%', border: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface2)', color: input.trim() && !loading ? 'var(--accent-ink)' : 'var(--text-muted)', transition: 'all 0.15s', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed' }}>
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
