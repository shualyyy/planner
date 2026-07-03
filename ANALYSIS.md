# Planer — полный анализ проекта

Дата: 3 июля 2026 · Репозиторий: github.com/shualyyy/planner · Проанализировано: `/src/components/`, `/src/store/`, `/src/services/`, `/src/hooks/` (~6900 строк)

---

## Этап 1 — Идеи для продукта

Отсортированы по impact/effort (лучшие сверху).

**1. Push-напоминания перед задачей.** Уведомление за 15/30/60 мин до `task_time`. Решает главную боль планировщика — задачи с временем пропускаются, при этом вся push-инфраструктура (VAPID, `send-push`, `push_subscriptions`, sw.ts) уже задеплоена, но ни разу не используется для задач. Сложность: **MED**. Затронет: миграция 007 (`tasks.reminder_offset`), `supabase/functions` (pg_cron-триггер, вызывающий send-push), `AddTaskModal.tsx` (пилюля «Remind»), `sw.ts` уже готов.

**2. Утренний дайджест «Сегодня».** Push в 8:00 со списком задач дня и привычек. Решает: пользователь не открывает приложение → забывает план. Сложность: **LOW** (переиспользует send-push + один cron). Затронет: `supabase/functions/daily-digest`, настройка-тумблер в `SettingsScreen.tsx`, `user_profiles.digest_time`.

**3. Смена статуса прямо на Kanban-доске.** Тап по карточке открывает меню статусов (сейчас `onClick={() => {}}` — карточки мёртвые). Решает: чтобы передвинуть задачу в In Progress, надо выйти с доски и открыть модалку редактирования. Сложность: **LOW**. Затронет: `ProjectsScreen.tsx` (ProjectDetailView), `taskStore.updateTask` — уже есть.

**4. «Rollover» просроченных задач.** Кнопка «Перенести всё на сегодня» над секцией Overdue. Решает: просроченные задачи накапливаются, переносить их можно только по одной через edit. Сложность: **LOW**. Затронет: `TasksScreen.tsx` (секция Overdue уже есть), `taskStore.updateTask` batch.

**5. Quick add через iOS Share Sheet (`share_target` PWA).** Шарить текст в Planer → chrono-node уже парсит даты из строки («созвон завтра в 15:00»). Сложность: **LOW-MED**. Затронет: `vite.config.ts` (manifest `share_target`), `App.tsx` (обработка `?share=`), `AddTaskModal.tsx` — парсер уже встроен.

**6. Гибкие привычки: N раз в неделю + streak freeze.** Решает: пропуск одного дня убивает streak — демотивация; поле `habits.frequency: 'weekly'` уже есть в схеме, но нигде не используется. Сложность: **MED**. Затронет: `TasksScreen.tsx` (HabitsInline, вся логика streak), миграция (`habits.target_per_week`), `StatsScreen.tsx`.

**7. Realtime-синхронизация для Coop.** `supabase.channel().on('postgres_changes', …)` на tasks/comments — изменения тиммейта появляются без перезахода. Решает: сейчас Coop-доска обновляется только при перезагрузке, для платной командной фичи это критично. Сложность: **MED**. Затронет: `taskStore.ts` (subscribe/unsubscribe), `App.tsx`. Таблицы — без изменений (включить Realtime в Supabase).

**8. Полноценные лейблы вместо хака `[label]` в description.** Решает: лейбл сейчас парсится regex'ом из description (`parseLabelFromDescription`) — description с текстом `[work]` ломает данные, поиск по описанию невозможен. Сложность: **MED**. Затронет: миграция 007 (`tasks.label` + backfill), `services/supabase.ts` (удалить 3 hack-функции), `AddTaskModal`, `TasksScreen`, `CalendarScreen`.

**9. Подзадачи-чеклисты.** Чеклист внутри TaskDetailSheet. Решает: крупные задачи не декомпозируются, приходится плодить отдельные задачи. Сложность: **MED-HIGH**. Затронет: таблица `subtasks` (+RLS), `TaskDetailSheet.tsx`, `taskStore.ts`, прогресс на `TaskRow`.

**10. Time-blocking: drag задач в TimeGrid.** Перетаскивание недатированных задач на сетку времени. Решает: планирование дня требует открытия модалки на каждую задачу. Сложность: **HIGH** (touch-DnD на iOS). Затронет: `CalendarScreen.tsx` (TimeGrid), `taskStore.updateTask`.

---

## Этап 2 — Аудит кода

| Файл | Строка | Тип | Описание | Исправление |
|---|---|---|---|---|
| `store/taskStore.ts` | 79–99 | **КРИТ** | `inviteMember` вставляет юзера в `project_members` **сразу** и создаёт invite со `status: 'accepted'`. Приглашённый попадает в чужой проект без согласия, а экран «Invites» в Settings никогда не покажет pending-приглашений | Создавать invite со `status: 'pending'`, member НЕ вставлять |
| `store/taskStore.ts` | 133–136 | **КРИТ** | `acceptInvite` только меняет статус invite и **не добавляет запись в `project_members`** — принятие приглашения ничего не делает | RPC-функция `accept_invite(invite_id)` в Postgres (SECURITY DEFINER): update status + insert member атомарно (RLS не даст сделать это с клиента) |
| `components/AddTaskModal.tsx` | 189 | **КРИТ** | `is_done: editTask?.is_done` — но `toggleDone` обновляет только `donIds`, а не `tasks[].is_done`. Редактирование выполненной задачи **сбрасывает её в невыполненную в БД** | Не включать `is_done` в payload при update. Корневое лечение — убрать дублирование donIds/is_done (Этап 3) |
| `components/SettingsScreen.tsx` | 77 | **КРИТ** | `transform: translateY(${shown ? dragY : 100}%)` — `dragY` в пикселях, а юнит `%`: свайп на 50px телепортирует шторку на 50% высоты | `translateY(${shown ? dragY + 'px' : '100%'})` |
| `components/MobileApp.tsx` | 61 | **PERF** | `groupTasksByDay(tasks, donIds)` вызывается на **каждый рендер** без memo, при этом каждая recurring-задача разворачивается в ~366 виртуальных копий. Любой setState в MobileApp пересоздаёт тысячи объектов и ре-рендерит все 5 экранов | `const grouped = useMemo(() => groupTasksByDay(tasks, donIds), [tasks, donIds])` |
| `store/taskStore.ts` | 391 | **ЛОГИКА** | Виртуальные инстансы recurring-задачи делят один `id` → «выполнить» или «удалить» инстанс на 5 июля выполняет/удаляет **всю серию** на год вперёд | Таблица `task_completions (task_id, date)`; done инстанса = запись в ней; delete — поле `recurrence_exceptions: string[]` |
| `components/AssistantScreen.tsx` | 273–284 | **ЛОГИКА** | `executeAction('add')` игнорирует `priority`, `project_id`, `recurrence` из ответа AI, хотя системный промпт явно требует их присылать. «Добавь в проект X» молча создаёт задачу без проекта | Пробросить: `project_id: action.project_id ?? null, priority: …, recurrence: …` |
| `components/AssistantScreen.tsx` | 319, 324 | **TS** | Слепой каст вывода LLM: `action.new_status as TaskStatus` — модель может прислать `"in-progress"` → упадёт check constraint в БД | `if (action.new_status && action.new_status in TASK_STATUSES) …` |
| `services/aiService.ts` | 229, 254–259 | **UX** | Если `JSON.parse` ACTION-строки упал, юзеру показывается сырой `ACTION:{"type":...}` в чате | В catch-ветке всё равно вырезать строку: `return { reply: rawReply.replace(/^ACTION:.*$/m, '').trim(), action: null }` |
| `components/MobileApp.tsx` | 126–136 | **UX** | Оффлайн-баннер обещает «changes will sync when reconnected» — **очереди мутаций нет**, оффлайн-запись просто упадёт с ошибкой | Честный текст «Offline — changes won't be saved» либо реальная очередь (Этап 3, п.2) |
| `components/ProjectsScreen.tsx` | 335 | **ЛОГИКА** | `onEditProject` принят, но никогда не вызывается → **проект невозможно отредактировать, заархивировать или удалить из UI** (в store методы есть) | Кнопка «⋯» в шапке ProjectDetailView → `onEditProject(project)` + пункт Delete |
| `components/ProjectsScreen.tsx` | 131 | **UX** | Карточка Kanban: `onClick={() => {}}` — доска read-only, статус не сменить | Открывать TaskDetailSheet или inline-меню статусов |
| `components/ProjectsScreen.tsx` | 138 | **UX** | Захардкоженные инициалы `AP` на каждой карточке — плейсхолдер уехал в прод | Инициалы реального `assigned_to` из `members[project.id]`, либо скрыть если не назначен |
| `components/AddTaskModal.tsx` | 278, 296, 484, 489 | **UX** | Захардкоженные тёмные цвета (`#F0ECE3`, `#2D2926`, `rgba(255,255,255,…)`) — в **светлой теме** заголовок и лейблы почти невидимы | Заменить на `var(--text)`, `var(--surface2)`, `var(--text-muted)` |
| `components/CalendarScreen.tsx` | 209–217 | **UX** | CalendarExpanded форсит `#1C1917` на body и белый текст независимо от темы | Использовать `var(--bg)` / `var(--text)` |
| `components/CalendarScreen.tsx` | 421, 496 | **ЛОГИКА** | `const now = new Date()` в теле TimeGrid — красная линия текущего времени замирает на моменте маунта и не движется | `const [now, setNow] = useState(new Date())` + `useEffect` с `setInterval(60_000)` |
| `components/TasksScreen.tsx` | 183–191 | **UX** | HistorySheet: drag-to-close навешан на весь sheet, включая скролл-зону — попытка проскроллить историю тянет шторку вниз | Повесить touch-хендлеры только на handle (как в TaskDetailSheet:101–105) |
| `components/TasksScreen.tsx` | 262–284, 311 | **PERF** | `streak`, `habitStreak`, `bestStreak` — линейный поиск по `habitLogs.some(...)` в цикле по дням × привычкам на каждый рендер, O(habits² × logs) | Один `useMemo`: `const logSet = new Set(logs.map(l => l.habit_id + l.completed_date))`, проверка через `logSet.has()` |
| `components/TasksScreen.tsx` | 575–577 | **PERF** | `overdueTasks` (flatMap по всем дням истории) считается на каждый рендер без memo | Обернуть в `useMemo([tasks, historyDays])` |
| `App.tsx` | 80–86 | **ЛОГИКА** | Пока `profile === null` (грузится), условие `profile && !profile.onboarded` ложно → новому юзеру на секунду вспыхивает главный экран до OnboardingScreen | Показывать лоадер, пока `session && !profile` |
| `store/taskStore.ts` | 333 | **ЛОГИКА** | `habit_logs` insert без `user_id` (в отличие от habits/tasks) — если RLS-политика требует `user_id = auth.uid()`, отметка привычки молча упадёт; ошибка только в console | Добавить `user_id` в insert либо убедиться, что политика проверяет владение через join на habits |
| `components/HabitsSheet.tsx` | 1–315 | **TS** | Мёртвый код: компонент не импортируется нигде (315 строк дублируют HabitsInline) | Удалить файл |
| `store/taskStore.ts` | 65, 76, 130, 184… | **TS** | Все ответы Supabase кастуются `as Task[]` без валидации; `Habit`-интерфейс не содержит `user_id`, хотя insert его пишет | `supabase gen types typescript` и типизировать клиент `createClient<Database>` |
| `components/*` (Paywall) | — | **ЛОГИКА** | Лимиты Free-плана (3 проекта, 5 привычек, AI) проверяются **только на клиенте** — обходятся через devtools/прямой API-запрос | Дублировать лимиты в RLS/триггерах Postgres и проверять `plan` в Edge Function `chat` |

---

## Этап 3 — Архитектурные рекомендации

### 1. Store: разбить монолит и убрать двойной источник правды

**Проблема →** `useTaskStore` — 396 строк, 8 доменов (tasks, projects, habits, members, invites, comments, profile, theme) в одном сторе. Хуже того, состояние «выполнено» живёт в двух местах: `donIds: Set` и `tasks[].is_done`, и они рассинхронизируются (`toggleDone` обновляет только Set) — это уже породило критический баг с перезаписью `is_done` (Этап 2). Плюс большинство компонентов деструктурируют весь стор (`const { tasks, projects, … } = useTaskStore()`) → подписка на все изменения.

**Решение →** Slices-паттерн Zustand: один стор, пять слайсов — `tasksSlice`, `projectsSlice`, `habitsSlice`, `collabSlice` (members/invites/comments), `uiSlice` (theme). Убрать `donIds` полностью: `is_done` на объекте Task — единственный источник; `toggleDone` мутирует `tasks[]`. Компоненты переводить на атомарные селекторы.

**Пример кода →**
```ts
// store/slices/tasksSlice.ts
export const createTasksSlice: StateCreator<Store, [], [], TasksSlice> = (set) => ({
  tasks: [],
  toggleDone: async (id) => {
    let next = false
    set(s => ({ tasks: s.tasks.map(t =>
      t.id === id ? (next = !t.is_done, { ...t, is_done: next }) : t) }))
    const { error } = await supabase.from('tasks').update({ is_done: next }).eq('id', id)
    if (error) set(s => ({ tasks: s.tasks.map(t =>
      t.id === id ? { ...t, is_done: !next } : t) }))
  },
})
// store/index.ts
export const useStore = create<Store>()((...a) => ({
  ...createTasksSlice(...a), ...createProjectsSlice(...a), ...createHabitsSlice(...a),
  ...createCollabSlice(...a), ...createUiSlice(...a),
}))
// в компонентах — селекторы вместо деструктуризации всего стора:
const tasks = useStore(s => s.tasks)
```

**План миграции →** (1) убрать `donIds`, перевести `groupTasksByDay` на `t.is_done` — это фиксит баг из Этапа 2; (2) разнести код по файлам-слайсам без изменения API; (3) заменить деструктуризацию на селекторы в топ-5 «тяжёлых» компонентах (MobileApp, TasksScreen, AssistantScreen).

**Риски →** шаг 1 трогает все места с `donIds` (7 файлов) — делать одним PR с ручной проверкой toggle/edit/recurring; селекторы менять постепенно, регрессий не дают.

### 2. Data fetching: TanStack Query + Realtime + офлайн-кэш

**Проблема →** Стор ходит в Supabase напрямую: нет кэша (каждый заход — полный рефетч всех таблиц), нет фонового обновления, AssistantScreen после каждого действия делает полный `fetchTasks()`, Coop не видит изменений тиммейтов без перезагрузки, а офлайн-баннер обещает синхронизацию, которой нет. Для iOS-PWA (где приложение постоянно выгружается из памяти) отсутствие персистентного кэша означает белый экран на каждый холодный старт.

**Решение →** TanStack Query как слой данных (Zustand остаётся для UI-состояния), плюс `persistQueryClient` в IndexedDB для мгновенного старта офлайн, плюс один Realtime-канал для инвалидации.

**Пример кода →**
```ts
// hooks/useTasks.ts
export const useTasks = () => useQuery({
  queryKey: ['tasks'],
  queryFn: async () => (await supabase.from('tasks').select('*')
    .order('task_date')).data as Task[],
  staleTime: 30_000,
})

export const useToggleDone = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, done }) =>
      supabase.from('tasks').update({ is_done: done }).eq('id', id),
    onMutate: async ({ id, done }) => {           // оптимистичный апдейт
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prev = qc.getQueryData<Task[]>(['tasks'])
      qc.setQueryData(['tasks'], ts => ts!.map(t => t.id === id ? { ...t, is_done: done } : t))
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx!.prev),
  })
}

// Realtime → инвалидация (один канал в App.tsx)
supabase.channel('db').on('postgres_changes',
  { event: '*', schema: 'public', table: 'tasks' },
  () => qc.invalidateQueries({ queryKey: ['tasks'] })
).subscribe()

// Оффлайн-персист (main.tsx)
persistQueryClient({ queryClient: qc,
  persister: createAsyncStoragePersister({ storage: idbStorage }) })
```

**План миграции →** (1) habits — самая изолированная сущность, обкатать паттерн; (2) tasks + мутации с optimistic updates; (3) Realtime-канал — сразу закрывает Coop-синхронизацию; (4) persistQueryClient + `networkMode: 'offlineFirst'` у мутаций — теперь офлайн-баннер говорит правду.

**Риски →** период двойного состояния (store + query) — мигрировать по сущности целиком, не по методу; Realtime-инвалидация может затирать optimistic-апдейты — ставить `invalidate` с debounce ~500мс; лимит Realtime-соединений на free-тарифе Supabase — один канал на клиента, не по каналу на таблицу.

### 3. Компоненты: разбить файлы-комбайны и вынести дубли

**Проблема →** `TasksScreen.tsx` — 871 строка и 6 компонентов (TaskRow, HistorySheet, HabitsInline, CoopTaskList + формы); `CalendarScreen.tsx` — 637 строк и 5 компонентов. Bottom-sheet с drag-to-close скопирован **пятью** независимыми реализациями (HistorySheet, EditProfileSheet, TaskDetailSheet, members-sheet в ProjectsScreen, DayPopup) — и в одной из копий уже живёт баг с `%` vs `px`. Утилита `dayKey()` определена в 5 файлах.

**Решение →** Feature-based структура + общий UI-кит:
```
src/
  lib/date.ts              // dayKey, addDays, startOfWeekMonday — одна копия
  components/ui/
    BottomSheet.tsx        // единый sheet: backdrop, drag-to-close, safe-area
    Pill.tsx  SegmentControl.tsx
  features/
    tasks/     TasksScreen.tsx  TaskRow.tsx  HistorySheet.tsx  CoopTaskList.tsx
    habits/    HabitsPanel.tsx  HabitCard.tsx  AddHabitForm.tsx
    calendar/  CalendarScreen.tsx  TimeGrid.tsx  Calendar30.tsx  DayPopup.tsx  CalendarExpanded.tsx
    projects/  ProjectsScreen.tsx  ProjectDetail.tsx  MembersSheet.tsx
    assistant/ AssistantScreen.tsx  ActionBubble.tsx  useSpeech.ts
```

**Пример кода →**
```tsx
// components/ui/BottomSheet.tsx — заменяет 5 реализаций
export function BottomSheet({ open, onClose, children, maxHeight = '92vh' }: Props) {
  const { dragY, isDragging, handleProps } = useDragToClose(onClose) // touch только на handle
  return createPortal(
    <div onClick={onClose} style={backdrop(open)}>
      <div onClick={e => e.stopPropagation()}
        style={{ ...sheet, maxHeight,
          transform: `translateY(${open ? `${dragY}px` : '100%'})`,
          transition: isDragging ? 'none' : 'transform .3s cubic-bezier(.32,.72,0,1)' }}>
        <div {...handleProps}><div style={grabber} /></div>
        {children}
      </div>
    </div>, document.body)
}
```

**План миграции →** (1) `lib/date.ts` + удалить `HabitsSheet.tsx` — час работы, ноль риска; (2) `BottomSheet` и перевод пяти шторок на него (заодно чинит баг EditProfileSheet и скролл HistorySheet); (3) распил TasksScreen/CalendarScreen на файлы — чисто механический перенос без изменения логики, отдельным PR.

**Риски →** большой diff конфликтует с параллельными ветками — делать распил, когда нет открытых фич-веток; в TaskRow живёт локальный swipe-state, при переносе сохранить key-стратегию `${id}-${dk}`, иначе состояние свайпа «перепрыгнет» между строками.

---

**Самое срочное:** связка `inviteMember`/`acceptInvite` (Coop сломан по сути), перезапись `is_done` при редактировании (тихая потеря данных) и `useMemo` вокруг `groupTasksByDay` (одна строка — заметное ускорение всего приложения).
