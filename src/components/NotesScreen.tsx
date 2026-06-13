import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type NoteTag = 'work' | 'personal' | 'ideas' | 'meetings'

interface Note {
  id: string
  title: string
  body: string
  tag: NoteTag | null
  task_id: string | null
  created_at: string
  updated_at: string
}

interface Attachment {
  id: string
  name: string
  kind: 'image' | 'file'
}

interface LinkedTask {
  title: string
  date: string
}

/* ──────────────────────────────────────────────────────────
   Tag model — colors mirror TASK_LABELS
   ────────────────────────────────────────────────────────── */

const NOTE_TAGS: Record<NoteTag, { name: string; color: string }> = {
  work:     { name: 'Работа',  color: '#B8D4F2' },
  personal: { name: 'Личное',  color: '#F5BDD0' },
  ideas:    { name: 'Идеи',    color: '#F5E28A' },
  meetings: { name: 'Встречи', color: '#C8B4E8' },
}

const FILTERS: { id: NoteTag | 'all'; name: string }[] = [
  { id: 'all',      name: 'Все' },
  { id: 'work',     name: 'Работа' },
  { id: 'personal', name: 'Личное' },
  { id: 'ideas',    name: 'Идеи' },
  { id: 'meetings', name: 'Встречи' },
]

/* Demo-only lookups (no DB yet). */
const LINKED_TASKS: Record<string, LinkedTask> = {
  task_a: { title: 'Дизайн-ревью с командой', date: '12 нояб · 10:30' },
}
const DEMO_ATTACHMENTS: Record<string, Attachment[]> = {
  n1: [
    { id: 'a1', name: 'mockup-v3.png', kind: 'image' },
    { id: 'a2', name: 'brief.pdf', kind: 'file' },
  ],
}

/* ──────────────────────────────────────────────────────────
   Store — local Zustand state (Supabase wiring added later)
   ────────────────────────────────────────────────────────── */

const now = () => new Date().toISOString()
const uid = () => Math.random().toString(36).slice(2, 10)

interface NotesState {
  notes: Note[]
  addNote: (note: Pick<Note, 'title' | 'body' | 'tag'>) => void
  updateNote: (id: string, patch: Partial<Omit<Note, 'id' | 'created_at'>>) => void
  deleteNote: (id: string) => void
}

const SAMPLE_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Идеи для онбординга',
    body: 'Показывать Dino на первом экране. Дать пример голосовой команды — «добавь созвон в 16:00». Меньше текста, больше действия.',
    tag: 'ideas',
    task_id: null,
    created_at: '2025-11-08T09:00:00.000Z',
    updated_at: '2025-11-11T18:20:00.000Z',
  },
  {
    id: 'n2',
    title: 'Повестка планёрки',
    body: 'Релиз v2.2, напоминания, экран заметок. Спросить про сроки бэкенда.',
    tag: 'meetings',
    task_id: 'task_a',
    created_at: '2025-11-10T11:30:00.000Z',
    updated_at: '2025-11-12T08:05:00.000Z',
  },
  {
    id: 'n3',
    title: 'Купить к выходным',
    body: 'Билеты в Лиссабон, подарок маме, новые кроссовки для пробежки.',
    tag: 'personal',
    task_id: null,
    created_at: '2025-11-11T20:00:00.000Z',
    updated_at: '2025-11-11T20:00:00.000Z',
  },
]

const useNotesStore = create<NotesState>((set) => ({
  notes: SAMPLE_NOTES,
  addNote: (note) =>
    set((s) => ({
      notes: [
        { id: uid(), task_id: null, created_at: now(), updated_at: now(), ...note },
        ...s.notes,
      ],
    })),
  updateNote: (id, patch) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...patch, updated_at: now() } : n
      ),
    })),
  deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
}))

/* ──────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────── */

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

const metaLabel: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'var(--text-muted)',
}

/* ──────────────────────────────────────────────────────────
   Icons — inline SVG, strokeWidth 2, round caps
   ────────────────────────────────────────────────────────── */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const PlusIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 5v14M5 12h14" /></svg>
)
const CloseIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}><path d="M18 6L6 18M6 6l12 12" /></svg>
)
const CameraIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
)
const ClipIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
)
const ImageIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
)
const FileIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
)
const TrashIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
)
const LinkIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
)

/* ──────────────────────────────────────────────────────────
   Tag chip + tag selector
   ────────────────────────────────────────────────────────── */

function TagChip({ tag }: { tag: NoteTag }) {
  const t = NOTE_TAGS[tag]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
      {t.name}
    </span>
  )
}

function TagSelector({ value, onChange }: { value: NoteTag | null; onChange: (t: NoteTag | null) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {(Object.keys(NOTE_TAGS) as NoteTag[]).map((k) => {
        const active = value === k
        const t = NOTE_TAGS[k]
        return (
          <button
            key={k}
            onClick={() => onChange(active ? null : k)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px',
              borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 550, transition: 'all 0.2s ease',
              background: active ? t.color : 'var(--surface2)',
              color: active ? '#1C1917' : 'var(--text-muted)',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#1C1917' : t.color, opacity: active ? 0.35 : 1 }} />
            {t.name}
          </button>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   Note card
   ────────────────────────────────────────────────────────── */

function NoteCard({ note, onOpen }: { note: Note; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--surface)', borderRadius: 18, boxShadow: 'var(--card-shadow)',
        padding: '15px 16px', marginBottom: 12, breakInside: 'avoid', cursor: 'pointer',
        transition: 'transform 0.2s ease',
      }}
    >
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 6, lineHeight: 1.25 }}>
        {note.title}
      </div>
      {note.body && (
        <div style={{
          fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', lineHeight: 1.5,
          letterSpacing: '-0.005em', marginBottom: 12,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {note.body}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {note.tag ? <TagChip tag={note.tag} /> : <span />}
        <span style={{ fontSize: 10.5, fontWeight: 450, color: 'var(--text-faint)', flexShrink: 0 }}>{fmtDate(note.updated_at)}</span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   Shared sheet shell
   ────────────────────────────────────────────────────────── */

function SheetShell({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) { setMounted(true); requestAnimationFrame(() => setShown(true)) }
    else { setShown(false); const t = setTimeout(() => setMounted(false), 300); return () => clearTimeout(t) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: shown ? 'rgba(0,0,0,0.46)' : 'rgba(0,0,0,0)',
        backdropFilter: shown ? 'blur(6px)' : 'none', WebkitBackdropFilter: shown ? 'blur(6px)' : 'none',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, background: 'var(--surface)',
          borderRadius: '28px 28px 0 0', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          boxShadow: '0 -8px 40px rgba(6,20,27,0.14)',
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

function DragHandle() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
    </div>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      style={{
        width: 28, height: 28, borderRadius: '50%', background: 'var(--surface2)',
        color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <CloseIcon />
    </button>
  )
}

/* ──────────────────────────────────────────────────────────
   Note detail sheet — autosave (debounced 800ms)
   ────────────────────────────────────────────────────────── */

function NoteDetailSheet({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const updateNote = useNotesStore((s) => s.updateNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState<NoteTag | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipFirst = useRef(true)

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setBody(note.body)
      setTag(note.tag)
      setAttachments(DEMO_ATTACHMENTS[note.id] ?? [])
      skipFirst.current = true
    }
  }, [note])

  const autosize = useCallback(() => {
    const el = bodyRef.current
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
  }, [])

  useEffect(() => { autosize() }, [body, note, autosize])

  // Debounced autosave
  useEffect(() => {
    if (!note) return
    if (skipFirst.current) { skipFirst.current = false; return }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateNote(note.id, { title, body, tag })
    }, 800)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [title, body, tag, note, updateNote])

  const linked = note?.task_id ? LINKED_TASKS[note.task_id] : undefined

  function addFile() {
    setAttachments((a) => [...a, { id: uid(), name: `файл-${a.length + 1}.pdf`, kind: 'file' }])
  }

  return (
    <SheetShell open={!!note} onClose={onClose}>
      <DragHandle />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 6px', flexShrink: 0 }}>
        <span style={metaLabel}>Заметка</span>
        <CloseButton onClose={onClose} />
      </div>

      <div style={{ overflowY: 'auto', padding: '6px 20px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <input
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="Без названия"
          style={{
            fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em',
            color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', width: '100%', lineHeight: 1.3,
          }}
        />

        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
          onInput={autosize}
          placeholder="Начни писать…"
          rows={1}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
            color: 'var(--text-2)', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6,
            letterSpacing: '-0.005em', minHeight: 80, overflow: 'hidden',
          }}
        />

        {/* Attachments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={metaLabel}>Вложения</span>
          {attachments.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {attachments.map((a) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 12,
                  background: 'var(--surface2)', flexShrink: 0, maxWidth: 180,
                }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{a.kind === 'image' ? <ImageIcon /> : <FileIcon />}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addFile} style={addFileBtn}><CameraIcon /> Камера</button>
            <button onClick={addFile} style={addFileBtn}><ClipIcon /> Добавить файл</button>
          </div>
        </div>

        {/* Linked task */}
        {linked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={metaLabel}>Связанная задача</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              borderRadius: 14, background: 'var(--surface2)',
            }}>
              <span style={{ color: 'var(--text-2)', display: 'flex' }}><LinkIcon /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{linked.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{linked.date}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tag */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={metaLabel}>Метка</span>
          <TagSelector value={tag} onChange={setTag} />
        </div>

        {/* Delete */}
        <button
          onClick={() => { if (note) deleteNote(note.id); onClose() }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', height: 48, borderRadius: 16, border: '1px solid rgba(217,79,79,0.25)',
            background: 'rgba(217,79,79,0.10)', color: 'var(--danger)', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4,
          }}
        >
          <TrashIcon /> Удалить
        </button>
      </div>
    </SheetShell>
  )
}

const addFileBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px',
  borderRadius: 12, border: '1px solid var(--hairline)', background: 'var(--surface2)',
  color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 550, cursor: 'pointer',
}

/* ──────────────────────────────────────────────────────────
   New note sheet
   ────────────────────────────────────────────────────────── */

function NewNoteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addNote = useNotesStore((s) => s.addNote)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState<NoteTag | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) { setTitle(''); setBody(''); setTag(null) }
  }, [open])

  function autosize() {
    const el = bodyRef.current
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
  }

  function save() {
    if (!title.trim() && !body.trim()) { onClose(); return }
    addNote({ title: title.trim() || 'Без названия', body: body.trim(), tag })
    onClose()
  }

  return (
    <SheetShell open={open} onClose={onClose}>
      <DragHandle />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 6px', flexShrink: 0 }}>
        <span style={metaLabel}>Новая заметка</span>
        <CloseButton onClose={onClose} />
      </div>

      <div style={{ overflowY: 'auto', padding: '6px 20px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <input
          autoFocus
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="Заголовок"
          style={{
            fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em',
            color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', width: '100%', lineHeight: 1.3,
          }}
        />
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
          onInput={autosize}
          placeholder="Текст заметки…"
          rows={3}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
            color: 'var(--text-2)', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6,
            letterSpacing: '-0.005em', minHeight: 90, overflow: 'hidden',
          }}
        />
        <TagSelector value={tag} onChange={setTag} />

        <button
          onClick={save}
          style={{
            width: '100%', height: 52, borderRadius: 16, border: 'none',
            background: 'var(--accent)', color: 'var(--accent-ink)', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', cursor: 'pointer',
            boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px rgba(6,20,27,0.12)',
          }}
        >
          Сохранить
        </button>
      </div>
    </SheetShell>
  )
}

/* ──────────────────────────────────────────────────────────
   Notes screen (default export)
   ────────────────────────────────────────────────────────── */

export default function NotesScreen() {
  const notes = useNotesStore((s) => s.notes)
  const [filter, setFilter] = useState<NoteTag | 'all'>('all')
  const [active, setActive] = useState<Note | null>(null)
  const [creating, setCreating] = useState(false)

  const visible = filter === 'all' ? notes : notes.filter((n) => n.tag === filter)
  // keep the open sheet in sync with store edits
  const activeLive = active ? notes.find((n) => n.id === active.id) ?? null : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '6px 24px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={metaLabel}>{visible.length} {visible.length === 1 ? 'заметка' : 'заметок'}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)', margin: '0 0 14px' }}>
          Заметки
        </h1>
        <div className="seg" style={{ display: 'flex', overflowX: 'auto', maxWidth: '100%' }}>
          {FILTERS.map((f) => (
            <button key={f.id} className={`seg-pill${filter === f.id ? ' on' : ''}`} onClick={() => setFilter(f.id)} style={{ whiteSpace: 'nowrap' }}>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px', paddingBottom: 90 }}>
        {visible.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
            <span style={{ fontSize: 13.5, fontWeight: 450, color: 'var(--text-muted)' }}>Пока нет заметок</span>
          </div>
        ) : (
          <div style={{ columnCount: 2, columnGap: 12 }}>
            {visible.map((n) => (
              <NoteCard key={n.id} note={n} onOpen={() => setActive(n)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setCreating(true)}
        style={{
          position: 'fixed', bottom: 'calc(68px + env(safe-area-inset-bottom, 0px) + 30px)', right: 22,
          width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 350, boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 8px 24px rgba(6,20,27,0.12)',
          transition: 'transform 0.15s ease',
        }}
      >
        <PlusIcon />
      </button>

      <NoteDetailSheet note={activeLive} onClose={() => setActive(null)} />
      <NewNoteSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
