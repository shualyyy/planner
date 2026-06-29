import { useState, useEffect, useRef } from 'react'
import { useTaskStore } from '../store/taskStore'
import type { Project } from '../services/supabase'
import { IcoChevronDown } from './icons'

interface Props {
  isOpen: boolean
  onClose: () => void
  editProject?: Project
}

const PROJECT_COLORS = [
  '#4A9EFF', '#3CC68A', '#D94F4F', '#C8A84B',
  '#9B7ACC', '#D97757', '#8ED4C8', '#F5BDD0',
]

export default function AddProjectModal({ isOpen, onClose, editProject }: Props) {
  const { addProject, updateProject } = useTaskStore()
  const isEditMode = !!editProject

  const [name, setName]               = useState('')
  const [color, setColor]             = useState(PROJECT_COLORS[0])
  const [description, setDescription] = useState('')
  const [saving, setSaving]           = useState(false)
  const [visible, setVisible]         = useState(false)
  const [error, setError]             = useState('')

  const nameRef = useRef<HTMLInputElement>(null)

  // Populate in edit mode
  useEffect(() => {
    if (isOpen && editProject) {
      setName(editProject.name)
      setColor(editProject.color)
      setDescription(editProject.description ?? '')
    }
  }, [isOpen, editProject])

  // Mount / focus
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setTimeout(() => nameRef.current?.focus(), 80)
    } else {
      setVisible(false)
    }
  }, [isOpen])

  // Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setName(''); setColor(PROJECT_COLORS[0]); setDescription('')
        setSaving(false); setError(''); setVisible(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  async function handleSubmit() {
    if (saving) return
    if (!name.trim()) { setError('Введи название проекта'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: name.trim(),
        color,
        description: description.trim() || null,
        is_archived: editProject?.is_archived ?? false,
      }
      if (isEditMode && editProject) {
        await updateProject(editProject.id, payload)
      } else {
        await addProject(payload)
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error('AddProject error:', err)
      setError(msg)
      setSaving(false)
    }
  }

  if (!isOpen && !visible) return null

  const shown = isOpen && visible

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: shown ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0)',
        backdropFilter: shown ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: shown ? 'blur(4px)' : 'none',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '560px',
          background: 'var(--surface)',
          borderRadius: '28px 28px 0 0',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          boxShadow: 'var(--sheet-shadow)',
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px 2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isEditMode ? 'Edit project' : 'New project'}
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '4px', borderRadius: '50%', background: 'var(--surface2)', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcoChevronDown size={15} />
          </button>
        </div>

        <div style={{ padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Name — Fraunces */}
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
            placeholder="Название проекта"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '22px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              lineHeight: 1.3,
            }}
          />

          {/* Color picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={metaLabel}>Color</span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: c, border: 'none', cursor: 'pointer',
                    boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание (необязательно)"
              rows={2}
              style={{
                width: '100%', background: 'var(--surface2)', border: '1px solid var(--hairline)',
                borderRadius: '12px', padding: '10px 14px', color: 'var(--text)',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                resize: 'none', lineHeight: 1.5, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSubmit}
            style={{
              width: '100%', height: '52px',
              borderRadius: '16px', border: 'none',
              background: saving ? 'var(--surface2)' : 'var(--accent)',
              color: saving ? 'var(--text-muted)' : '#fff',
              fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              boxShadow: saving ? 'none' : '0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px var(--accent-glow)',
              fontFamily: 'inherit',
            }}
          >
            {saving
              ? (isEditMode ? 'Сохраняю…' : 'Создаю…')
              : (isEditMode ? 'Сохранить' : 'Создать проект')
            }
          </button>

          {error && (
            <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: '12px', padding: '10px 14px', borderRadius: '12px', lineHeight: 1.5 }}>
              ⚠ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const metaLabel: React.CSSProperties = {
  fontSize: '10.5px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-muted)',
}
