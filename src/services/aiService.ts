import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns'

export interface ParsedTask {
  title: string
  task_date: string
  task_time: string | null
  description: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface GroqChatResponse {
  choices: Array<{ message: { content: string } }>
}

function buildSystemPrompt(): string {
  const now = new Date()
  return `You are a calendar assistant. Your ONLY job is to add tasks to the user's calendar instantly.

Today's date is ${format(now, 'EEEE, MMMM d, yyyy')}.

When the user describes a task:
1. Extract: title, date (YYYY-MM-DD), time (HH:MM 24h format or null), description (null if none)
2. IMMEDIATELY add it — do NOT ask for confirmation. Just do it.
3. Respond with EXACTLY this format (JSON first, then one short confirmation line):

PARSED_TASK:{"title":"...","task_date":"YYYY-MM-DD","task_time":"HH:MM or null","description":"... or null"}
Added ✓

Rules for relative dates:
- "today" / "сегодня" = ${format(now, 'yyyy-MM-dd')}
- "tomorrow" / "завтра" = ${format(addDays(now, 1), 'yyyy-MM-dd')}
- "next Monday" / "в понедельник" = next Monday
- Any weekday name = next occurrence of that day

If date is completely missing and cannot be inferred, ask ONLY for the date — nothing else.
If the message is unrelated to adding tasks, reply briefly and redirect.
Never ask "shall I add this?" or "confirm?" — just add it.`
}

function resolveRelativeDate(text: string): string {
  const today = new Date()
  const lower = text.toLowerCase()
  if (lower.includes('today') || lower.includes('сегодня')) return format(today, 'yyyy-MM-dd')
  if (lower.includes('tomorrow') || lower.includes('завтра')) return format(addDays(today, 1), 'yyyy-MM-dd')
  if (lower.includes('monday') || lower.includes('понедельник')) return format(nextMonday(today), 'yyyy-MM-dd')
  if (lower.includes('tuesday') || lower.includes('вторник')) return format(nextTuesday(today), 'yyyy-MM-dd')
  if (lower.includes('wednesday') || lower.includes('среда') || lower.includes('среду')) return format(nextWednesday(today), 'yyyy-MM-dd')
  if (lower.includes('thursday') || lower.includes('четверг')) return format(nextThursday(today), 'yyyy-MM-dd')
  if (lower.includes('friday') || lower.includes('пятниц')) return format(nextFriday(today), 'yyyy-MM-dd')
  if (lower.includes('saturday') || lower.includes('суббот')) return format(nextSaturday(today), 'yyyy-MM-dd')
  if (lower.includes('sunday') || lower.includes('воскресен')) return format(nextSunday(today), 'yyyy-MM-dd')
  return ''
}

export async function sendMessage(
  history: ChatMessage[],
  userMessage: string
): Promise<{ reply: string; parsedTask: ParsedTask | null }> {
  const messages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
    },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `API error ${res.status}`)
  }

  const data = (await res.json()) as GroqChatResponse
  const reply: string = data.choices?.[0]?.message?.content ?? ''

  // Extract PARSED_TASK JSON if present
  const taskMatch = reply.match(/PARSED_TASK:(\{.*?\})/s)
  if (taskMatch) {
    try {
      const raw = JSON.parse(taskMatch[1]) as ParsedTask
      if (!raw.task_date || raw.task_date === 'null') {
        const resolved = resolveRelativeDate(userMessage)
        if (resolved) raw.task_date = resolved
      }
      // Normalize task_time null
      if (raw.task_time === 'null' || raw.task_time === '') raw.task_time = null
      if (raw.description === 'null' || raw.description === '') raw.description = null

      return { reply: '✓ Added to your calendar!', parsedTask: raw }
    } catch {
      // fall through
    }
  }

  return { reply, parsedTask: null }
}
