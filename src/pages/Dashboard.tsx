import { useState, useEffect } from 'react'
import { FileText, Tag, Clock, CheckCircle } from 'lucide-react'
import { api } from '../api/client'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, done: 0, pending: 0, domains: 0 })

  useEffect(() => {
    Promise.all([api.getDocuments(), api.getJobStats(), api.getDomains()])
      .then(([docs, jobs, domains]) => {
        setStats({
          total:   docs.length,
          done:    (jobs['done'] || 0),
          pending: (jobs['pending'] || 0) + (jobs['processing'] || 0),
          domains: (domains as unknown[]).length,
        })
      }).catch(console.error)
  }, [])

  const cards = [
    { label: 'Documents importés',  value: stats.total,   icon: FileText,    color: 'var(--accent)' },
    { label: 'Analyses terminées',  value: stats.done,    icon: CheckCircle, color: 'var(--accent-2)' },
    { label: 'En file d\'attente',  value: stats.pending, icon: Clock,       color: 'var(--accent-warn)' },
    { label: 'Domaines identifiés', value: stats.domains, icon: Tag,         color: '#a78bfa' },
  ]

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>
          Tableau de bord
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
          Vue d'ensemble de votre base de connaissances
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{label}</div>
              </div>
              <div style={{ background: `${color}18`, borderRadius: 8, padding: 8 }}>
                <Icon size={18} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: 'var(--text-muted)' }}>
          Tendances des domaines — disponible après 10+ documents
        </div>
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: 15, borderRadius: 8, border: '1px dashed var(--border)' }}>
          {stats.total < 10 ? `${stats.total}/10 documents analysés` : 'Graphique à venir'}
        </div>
      </div>
    </div>
  )
}
