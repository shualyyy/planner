/**
 * Feature flags — временно скрытые части приложения.
 *
 * Ничего не удалено: весь код экранов на месте, он просто не рендерится.
 * Чтобы вернуть функцию — поставь `true` и пересобери, больше ничего не нужно.
 */
export interface FeatureFlags {
  /** Вкладка «Projects» — Kanban-доски, участники, приглашения по Planer ID */
  projects: boolean
  /** Вкладка «AI» — чат-ассистент с инструментами */
  assistant: boolean
  /** Сегмент «Coop» на вкладке задач — общие задачи с командой */
  coop: boolean
  /** Сегмент «Habits» на вкладке задач — трекер привычек */
  habits: boolean
  /** Список задач выбранного дня под сеткой календаря */
  calendarDayList: boolean
}

export const FEATURES: FeatureFlags = {
  projects: false,
  assistant: false,
  coop: false,
  habits: true,
  calendarDayList: false,
}
