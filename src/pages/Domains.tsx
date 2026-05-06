import { Tag, GitMerge } from 'lucide-react'

export default function Domains() {
  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>
          Domaines de recherche
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Domaines extraits automatiquement — fusionnez les synonymes ici
        </p>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 0',
        gap: 12,
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', gap: 12, opacity: 0.3 }}>
          <Tag size={28} />
          <GitMerge size={28} />
        </div>
        <div style={{ fontSize: 13 }}>
          Les domaines apparaîtront ici après l'analyse des premiers documents
        </div>
      </div>
    </div>
  )
}
