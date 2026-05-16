export default function WinsScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 12, padding: 32, textAlign: 'center', background: 'var(--bg)',
    }}>
      <div style={{ fontSize: 48 }}>🏆</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Big update coming</div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        We're building something special.<br/>Stay tuned.
      </div>
    </div>
  )
}
