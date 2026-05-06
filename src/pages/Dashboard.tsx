import { FileText, Tag, Clock, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const stats = [
    { label: 'Documents analysés', value: '—', icon: FileText, color: 'var(--accent)' },
    { label: 'Domaines identifiés', value: '—', icon: Tag, color: 'var(--accent-2)' },
    { label: 'En file d\'attente', value: '—', icon: Clock, color: 'var(--accent-warn)' },
    { label: 'Dernière analyse', value: '—', icon: TrendingUp, color: '#a78bfa' },
  ]

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>
          Tableau de bord
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Vue d'ensemble de votre base de connaissances scientifiques
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
              </div>
              <div style={{
                background: `${color}18`,
                borderRadius: 8,
                padding: 8,
                display: 'flex',
              }}>
                <Icon size={18} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder pour tendances */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <TrendingUp size={16} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Tendances des domaines de recherche</span>
        </div>
        <div style={{
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
          borderRadius: 8,
          border: '1px dashed var(--border)',
        }}>
          Disponible après import des premiers documents
        </div>
      </div>
    </div>
  )
}
