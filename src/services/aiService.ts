import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────────────

export type ActionType = 'add' | 'delete' | 'reschedule' | 'done' | 'undone' | 'edit' | 'list' | 'set_status' | 'set_priority' | 'set_project'

export interface ParsedAction {
  type: ActionType
  // ADD
  title?: string
  task_date?: string
  task_time?: string | null
  task_time_end?: string | null
  description?: string | null
  project_id?: string | null
  status?: string | null
  priority?: string | null
  // Reference (delete / done / undone / reschedule / edit)
  task_id?: string
  task_title?: string
  // RESCHEDULE
  new_date?: string
  new_time?: string | null
  // EDIT
  new_title?: string
  new_description?: string | null
  // STATUS / PRIORITY / PROJECT
  new_status?: string | null
  new_priority?: string | null
  new_project_id?: string | null
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
  status?: string | null
  priority?: string | null
  project_id?: string | null
}

export interface ProjectSummary {
  id: string
  name: string
  color: string
  is_archived: boolean
}

interface GroqChatResponse {
  choices: Array<{ message: { content: string } }>
}

// ── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(tasks: TaskSummary[], projects: ProjectSummary[] = []): string {
  const now = new Date()

  const taskListJson = tasks.length
    ? JSON.stringify(
        tasks.map(t => ({
          id: t.id,
          title: t.title,
          date: t.task_date,
          time: t.task_time ?? null,
          done: t.is_done,
          status: t.status ?? 'not_started',
          priority: t.priority ?? 'medium',
          project_id: t.project_id ?? null,
        })),
        null, 2
      )
    : '[]'

  const projectListJson = projects.length
    ? JSON.stringify(projects.map(p => ({ id: p.id, name: p.name, archived: p.is_archived })), null, 2)
    : '[]'

  const timeStr = format(now, 'HH:mm')
  const todayStr = format(now, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd')

  return `You are a smart work assistant built into a task planner app.
Today: ${format(now, 'EEEE, MMMM d, yyyy')} · Current time: ${timeStr}

PROJECTS:
${projectListJson}

TASKS:
${taskListJson}

━━━━━━━━━━━━━━━━━━━━━━━
ACTIONS — put JSON on FIRST line, then 1 short reply (match user's language — Russian or English).

ADD task:
ACTION:{"type":"add","title":"...","task_date":"YYYY-MM-DD","task_time":"HH:MM or null","priority":"high|medium|low","project_id":"ID or null","description":null}

ADD recurring task:
ACTION:{"type":"add","title":"...","task_date":"YYYY-MM-DD","task_time":"HH:MM or null","recurrence":"daily|weekly|monthly","project_id":"ID or null","description":null}

DELETE:
ACTION:{"type":"delete","task_id":"ID","task_title":"..."}

RESCHEDULE:
ACTION:{"type":"reschedule","task_id":"ID","task_title":"...","new_date":"YYYY-MM-DD","new_time":"HH:MM or null"}

MARK DONE:
ACTION:{"type":"done","task_id":"ID","task_title":"..."}

MARK UNDONE:
ACTION:{"type":"undone","task_id":"ID","task_title":"..."}

SET STATUS (in_progress / blocked / not_started):
ACTION:{"type":"set_status","task_id":"ID","task_title":"...","new_status":"in_progress|blocked|not_started"}

SET PRIORITY (high / medium / low):
ACTION:{"type":"set_priority","task_id":"ID","task_title":"...","new_priority":"high|medium|low"}

ASSIGN TO PROJECT:
ACTION:{"type":"set_project","task_id":"ID","task_title":"...","new_project_id":"PROJECT_ID"}

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
- NEVER ask for confirmation — act immediately
- Infer missing time ("вечером/evening" → 19:00, "утром/morning" → 09:00, "днём/noon" → 13:00)
- If only weekday mentioned, use NEXT occurrence of that day
- If task not found by name, say so and list similar
- For LIST: group by project or date, show status/priority if set
- When user says "add X to [project name]" — find project_id from PROJECTS and include it
- When user asks what's blocked / in progress — filter TASKS by status
- Recurring: "every day/ежедневно"=daily, "every week/еженедельно"=weekly, "every month"=monthly
- Replies: max 2 sentences, warm and direct
- Projects: always use project name in replies, never raw IDs`
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
    case 'add':          return `Added "${action.title}" ✓`
    case 'delete':       return `Deleted "${action.task_title}" ✓`
    case 'reschedule':   return `Rescheduled "${action.task_title}" ✓`
    case 'done':         return `Marked "${action.task_title}" done ✓`
    case 'undone':       return `Unmarked "${action.task_title}" ✓`
    case 'edit':         return `Updated "${action.task_title}" ✓`
    case 'set_status':   return `Status updated ✓`
    case 'set_priority': return `Priority updated ✓`
    case 'set_project':  return `Assigned to project ✓`
    default:             return '✓'
  }
}

// ── Main send function ────────────────────────────────────────────────────

export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
  tasks: TaskSummary[] = [],
  projects: ProjectSummary[] = []
): Promise<{ reply: string; action: ParsedAction | null }> {
  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(tasks, projects) },
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
