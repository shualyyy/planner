# Planer — Full System Debug Prompt for Claude Code

## Context
React 18 + TypeScript + Vite PWA, iOS-first mobile app.
Stack: Supabase (auth + DB), Zustand store, Groq AI via Supabase Edge Function.
Location: `~/Desktop/Planer`

---

## 1. TypeScript Build — Fix All Errors

Run `npm run build` and fix **every** TypeScript error until the build passes cleanly.

Common areas to check:
- Unused imports across all `src/components/*.tsx`
- `groupTasksByDay` return type (`Record<string, (Task & { done: boolean })[]>`) — make sure every component consuming it destructures correctly
- `toggleDone` called as `toggleDone(id)` (1 arg) but some call sites pass 2 args — standardise
- `AddProjectModal.tsx` — check for leftover Russian strings in error messages and placeholders
- `ChatPanel.tsx` and `NotesScreen.tsx` — these files exist but may not be wired into `MobileApp.tsx`; either integrate or safely remove

---

## 2. MobileApp.tsx — Tab System

File: `src/components/MobileApp.tsx`

Verify:
- 5 tabs render correctly: Calendar, Tasks, Projects, AI (AssistantTabIcon), You
- `tab === 'assistant'` renders `<AssistantScreen />`
- FAB shows only on calendar / tasks / projects tabs, not on assistant / settings
- Tab icon active color is `#D97757` (not `#e35914` — old orange)
- `createPortal` is used for both the tab bar and FAB (required for iOS fixed-in-fixed)
- `calPopupOpen` hides tab bar when calendar popup is open

---

## 3. AssistantScreen.tsx — AI Tab

File: `src/components/AssistantScreen.tsx`

Verify and fix:
- **No DinoMascot** — should be completely removed
- `recognition.lang` must be `'en-US'` (not `'ru-RU'`)
- Input bar left padding is `16px` (not `76px`)
- `sendMessage` is called with `(history, userMessage, tasks, projectSummaries)` — 4 args
- `projectSummaries` is built from `useTaskStore().projects`
- Action handler covers: `add | delete | reschedule | done | undone | edit | list | set_status | set_priority | set_project`
- Welcome message: `'Hey! I can add, move, complete, and organize your tasks. I also know your projects — just tell me what to do.'`
- Placeholder: `loading ? 'Thinking…' : 'Message AI…'`

---

## 4. aiService.ts — AI Logic

File: `src/services/aiService.ts`

Verify:
- `sendMessage` signature: `(history: Message[], userMessage: string, tasks: TaskSummary[], projects: ProjectSummary[]): Promise<AssistantReply>`
- System prompt includes full TASKS and PROJECTS JSON context
- Action types exported: `'add' | 'delete' | 'reschedule' | 'done' | 'undone' | 'edit' | 'list' | 'set_status' | 'set_priority' | 'set_project'`
- Assistant is described as "a smart work assistant" (not "Dino")
- The edge function URL points to the correct Supabase project

---

## 5. HabitsSheet.tsx — Habits

File: `src/components/HabitsSheet.tsx`

Verify and fix:
- `HABIT_COLORS` first entry is `'#D97757'` (Claude coral, not `'#e35914'`)
- Inline add form works: shows when `showForm === true`, has color picker + name input
- Sheet is accessible even with 0 habits (the "Habits →" button in TasksScreen should always render)
- All text is English (no Russian strings)
- `CheckSvg` stroke color uses `'#1C1917'` (warm dark, not `'#0A0A0F'`)

---

## 6. TasksScreen.tsx — Tasks Tab

File: `src/components/TasksScreen.tsx`

Verify:
- History button is a small **clock SVG icon** with an orange badge dot — no text label
- Habits strip: always renders the "Habits →" button; pill chips only render if `habits.length > 0`
- No avatar/profile icon in top-right corner
- All text is English
- Hardcoded surface colors use Claude palette (`#242120`, `#2D2926`) not old (`#111118`, `#16161E`)
- Task card background: `#242120` border: `rgba(255,255,255,0.08)`
- `near` time indicator uses `var(--accent-soft)` / `#D97757` not `#e35914`

---

## 7. CalendarScreen.tsx — Calendar

File: `src/components/CalendarScreen.tsx`

Verify:
- `.cal-card` background is `#242120` (warm dark) not `#1C1C26` (old cold)
- `.d30` cells: `justify-content: center; gap: 3px; align-items: center`
- `.d-dots` always renders (even with 0 dots) — `height: 4px; display: flex; align-items: center`
- Day numbers are vertically centered within each cell
- Expanded calendar background is `#1C1917`
- Tab bar is hidden during popup/expanded state via `onPopupChange`

---

## 8. ProjectsScreen.tsx — Projects

File: `src/components/ProjectsScreen.tsx`

Verify:
- All text is English ("← Projects", "h", "m" for time units, "Board", "Active", "To Do", "Blocked", "Done")
- Back button color: `#D97757`
- Status color for `in_progress`: `#D97757`
- Kanban card background: `#242120`, border `rgba(255,255,255,0.07)`
- Column header background: `#2D2926`
- `#16161E` / `#111118` fully replaced — use `#2D2926` / `#242120`

---

## 9. AddTaskModal.tsx

File: `src/components/AddTaskModal.tsx`

Verify:
- All labels/placeholders in English
- Submit button background: `#D97757`
- Value pills with active color: `#D97757`
- Surface color in date/time pickers: `#2D2926`
- `time_estimate` field works (number of minutes, displays as "Xh Ym")

---

## 10. AddProjectModal.tsx

File: `src/components/AddProjectModal.tsx`

Fix:
- Translate any remaining Russian strings (error messages, placeholder text)
- First color in color picker array: `'#D97757'`
- Surface backgrounds use `#242120` / `#2D2926`

---

## 11. index.css — Design Tokens

File: `src/index.css`

Confirm these exact values are set:
```css
--bg:          #1C1917;
--surface:     #242120;
--surface2:    #2D2926;
--surface3:    #35302C;
--accent:      #D97757;
--accent-soft: rgba(217,119,87,0.15);
--accent-2:    rgba(217,119,87,0.35);
--accent-glow: rgba(217,119,87,0.30);
--info:        #D97757;
--info-hover:  #E8896A;
--tabbar-bg:   rgba(28,25,23,0.95);
--cal-bg:      #1C1917;
--bg-2:        #2D2926;
--ev-ink:      #1C1917;
--font-sans:   ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
```

Also confirm:
- `.tab.on { color: #D97757; }`
- `.tabbar { background: rgba(28,25,23,0.96); }`
- `.cal-card { background: #242120; }`

---

## 12. index.html

File: `index.html`

Confirm:
- `<title>Planer</title>`
- `<meta name="apple-mobile-web-app-title" content="Planer" />`
- No Google Fonts `<link>` tags

---

## 13. Global Color Scan

Run this and fix every match:
```bash
grep -rn '#e35914\|#E35914\|#111118\|#16161E\|#0A0A0F\|#1C1C26\|#0f0f11\|Inter\|rgba(10,10,15\|rgba(12,12,12' src/ \
  | grep -v 'prevInterim\|interimRef\|\.js\.map'
```

Expected result: **zero matches**.

---

## 14. Supabase Edge Function

File: `supabase/functions/chat/index.ts`

Verify:
- CORS headers allow `*`
- Reads `GROQ_API_KEY` from `Deno.env`
- Model is `llama-3.3-70b-versatile`
- Returns the full Groq response as-is
- No changes needed unless build scan finds issues

---

## 15. SettingsScreen.tsx

File: `src/components/SettingsScreen.tsx`

Verify:
- No `dino.png` reference
- No "Reminders" section
- Footer reads: `"Planer · v2.1"`
- All text in English

---

## Stop Conditions

Stop and ask before:
- Changing Supabase schema or RLS policies
- Modifying `supabase/functions/chat/index.ts` logic
- Adding new features not listed above
- Changing any color that is NOT in the list above

---

## Verification Steps

After all fixes:

1. `npm run build` — must complete with 0 TypeScript errors
2. Run global color scan (step 13) — must return 0 matches
3. Run: `grep -rn 'Inter' src/components/ | grep -v 'prevInterim\|interimRef'` — must return 0 matches
4. Run: `grep -rn 'Dino\|дин\|рус\|Привет\|Задач\|Добавить\|Отмена\|Сохранить' src/` — must return 0 matches (no Russian / Dino references)
5. Confirm `index.html` title = "Planer"
