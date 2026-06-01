import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────────────

export type ActionType = 'add' | 'delete' | 'reschedule' | 'done' | 'undone' | 'edit' | 'list'

export interface ParsedAction {
  type: ActionType
  // ADD
  title?: string
  task_date?: string
  task_time?: string | null
  task_time_end?: string | null
  description?: string | null
  // Reference (delete / done / undone / reschedule / edit)
  task_id?: string
  task_title?: string
  // RESCHEDULE
  new_date?: string
  new_time?: string | null
  // EDIT
  new_title?: string
  new_description?: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TaskSummary {
  id: string
  title: string
  task_date: string
  task_time: string | null
  is_done: boolean
}

interface GroqChatResponse {
  choices: Array<{ message: { content: string } }>
}

// ── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(tasks: TaskSummary[]): string {
  const now = new Date()

  const taskListJson = tasks.length
    ? JSON.stringify(
        tasks.map(t => ({
          id: t.id,
          title: t.title,
          date: t.task_date,
          time: t.task_time ?? null,
          done: t.is_done,
        })),
        null,
        2
      )
    : '[]'

  const timeStr = format(now, 'HH:mm')
  const todayStr = format(now, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd')

  return `You are Dino — a smart, friendly calendar assistant built into a task planner app.
Today: ${format(now, 'EEEE, MMMM d, yyyy')} · Current time: ${timeStr}

CURRENT TASKS:
${taskListJson}

━━━━━━━━━━━━━━━━━━━━━━━
ACTIONS — put JSON on FIRST line, then 1 short reply in Russian (or English if user writes English).

ADD task:
ACTION:{"type":"add","title":"...","task_date":"YYYY-MM-DD","task_time":"HH:MM or null","description":"null"}

ADD recurring task (повторяющаяся):
ACTION:{"type":"add","title":"...","task_date":"YYYY-MM-DD","task_time":"HH:MM or null","recurrence":"daily|weekly|monthly","description":"null"}

DELETE:
ACTION:{"type":"delete","task_id":"ID","task_title":"..."}

RESCHEDULE:
ACTION:{"type":"reschedule","task_id":"ID","task_title":"...","new_date":"YYYY-MM-DD","new_time":"HH:MM or null"}

MARK DONE:
ACTION:{"type":"done","task_id":"ID","task_title":"..."}

MARK UNDONE:
ACTION:{"type":"undone","task_id":"ID","task_title":"..."}

EDIT:
ACTION:{"type":"edit","task_id":"ID","task_title":"...","new_title":"... or null","new_description":"... or null"}

LIST tasks:
ACTION:{"type":"list"}
Then show matching tasks in a friendly readable format.

━━━━━━━━━━━━━━━━━━━━━━━
DATE SHORTCUTS:
- сегодня/today = ${todayStr}
- завтра/tomorrow = ${tomorrowStr}
- послезавтра = ${format(addDays(now, 2), 'yyyy-MM-dd')}
- на этой неделе = nearest matching weekday
- через неделю = ${format(addDays(now, 7), 'yyyy-MM-dd')}
- вечером (no time given) = 19:00
- утром = 09:00
- в обед = 13:00

SMART RULES:
- NEVER ask for confirmation — just do it immediately
- Infer missing time from context ("вечером" → 19:00, "утром" → 09:00)
- If only a weekday mentioned (пятница, Monday), use the NEXT occurrence
- If task not found by name, say so briefly and list similar tasks
- For LIST requests, group by date and show time if available
- Recurring words: каждый день=daily, каждую неделю=weekly, каждый месяц=monthly, ежедневно=daily, еженедельно=weekly
- Keep replies SHORT — max 2 sentences
- Be warm and friendly like a helpful assistant, not robotic`
}

// ── Date resolver ─────────────────────────────────────────────────────────

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

// ── Fallback confirmation ──────────────────────────────────────────────────

function confirmationFor(action: ParsedAction): string {
  switch (action.type) {
    case 'add':        return `Добавил «${action.title}» ✓`
    case 'delete':     return `Удалил «${action.task_title}» ✓`
    case 'reschedule': return `Перенёс «${action.task_title}» ✓`
    case 'done':       return `Отметил «${action.task_title}» как выполненную ✓`
    case 'undone':     return `Снял отметку с «${action.task_title}» ✓`
    case 'edit':       return `Обновил «${action.task_title}» ✓`
    default:           return '✓'
  }
}

// ── Main send function ────────────────────────────────────────────────────

export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
  tasks: TaskSummary[] = []
): Promise<{ reply: string; action: ParsedAction | null }> {
  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(tasks) },
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
  const rawReply: string = data.choices?.[0]?.message?.content ?? ''

  // Parse ACTION JSON from first line
  const actionMatch = rawReply.match(/^ACTION:(\{.*?\})/m)
  if (actionMatch) {
    try {
      const action = JSON.parse(actionMatch[1]) as ParsedAction

      // Resolve relative dates
      if (action.type === 'add') {
        if (!action.task_date || action.task_date === 'null') {
          const resolved = resolveRelativeDate(userMessage)
          if (resolved) action.task_date = resolved
        }
        if (action.task_time === 'null' || action.task_time === '') action.task_time = null
        if (action.description === 'null' || action.description === '') action.description = null
      }

      if (action.type === 'reschedule') {
        if (!action.new_date || action.new_date === 'null') {
          const resolved = resolveRelativeDate(userMessage)
          if (resolved) action.new_date = resolved
        }
        if (action.new_time === 'null' || action.new_time === '') action.new_time = null
      }

      const cleanReply = rawReply.replace(/^ACTION:\{.*?\}\n?/m, '').trim()
      return { reply: cleanReply || confirmationFor(action), action }
    } catch {
      // fall through to plain reply
    }
  }

  return { reply: rawReply, action: null }
}
