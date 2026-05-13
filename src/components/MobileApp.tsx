import { useState } from 'react'
import Calendar from './Calendar'
import ChatPanel from './ChatPanel'
import TodayTasks from './TodayTasks'
import SettingsModal from './SettingsModal'

type Tab = 'calendar' | 'today' | 'chat'

const CalIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
)

const TasksIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l2 2 4-4M9 14l2 2 4-4" />
    <path d="M3 6h2M3 14h2M3 20h18" />
  </svg>
)

const ChatIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16a2 2 0 012 2v9a2 2 0 01-2 2h-8l-5 4v-4H4a2 2 0 01-2-2V7a2 2 0 012-2z" />
  </svg>
)

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

const TABS = [
  { id: 'calendar' as Tab, label: 'Calendar', Icon: CalIcon },
  { id: 'today' as Tab, label: 'Today', Icon: TasksIcon },
  { id: 'chat' as Tab, label: 'Assistant', Icon: ChatIcon },
]

interface MobileAppProps {
  selectedDate: Date
  setSelectedDate: (d: Date) => void
}

export default function MobileApp({ selectedDate, setSelectedDate }: MobileAppProps) {
  const [tab, setTab] = useState<Tab>('today')
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Gear icon — fixed top-right */}
      <button
        onClick={() => setSettingsOpen(true)}
        style={{
          position: 'fixed',
          top: '14px',
          right: '16px',
          zIndex: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          WebkitTapHighlightColor: 'transparent',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
      >
        <GearIcon />
      </button>

      {/* Panels — all mounted, only one visible at a time (keeps state alive) */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>

        <div style={{
          position: 'absolute', inset: 0,
          display: tab === 'calendar' ? 'flex' : 'none',
          flexDirection: 'column',
        }}>
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={(d) => { setSelectedDate(d); setTab('today') }}
          />
        </div>

        <div style={{
          position: 'absolute', inset: 0,
          display: tab === 'today' ? 'flex' : 'none',
          flexDirection: 'column',
        }}>
          <TodayTasks selectedDate={selectedDate} />
        </div>

        <div style={{
          position: 'absolute', inset: 0,
          display: tab === 'chat' ? 'flex' : 'none',
          flexDirection: 'column',
        }}>
          <ChatPanel />
        </div>

      </div>

      {/* Bottom tab bar */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid var(--border-soft)',
        background: '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex' }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 0 10px',
                cursor: 'pointer',
                color: active ? 'var(--accent-2)' : 'var(--text-muted)',
                fontFamily: 'inherit',
                fontSize: 10.5,
                fontWeight: active ? 600 : 500,
                letterSpacing: '0.01em',
                transition: 'color 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon active={active} />
              {label}
            </button>
          )
        })}
        </div>
        {/* Safe area fill — extends background under home indicator */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: '#0f0f0f' }} />
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
