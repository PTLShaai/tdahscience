import { useState, useEffect } from 'react'
import { Tag, GitMerge, FileText } from 'lucide-react'
import { api } from '../api/client'

interface Domain {
  id: string
  slug: string
  label: string
  doc_count: number
  aliases: string[]
}

export default function Domains() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDomains().then(data => {
      setDomains(data as Domain[])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</div>
  )

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>
          Domaines de recherche
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Extraits automatiquement · {domains.length} domaine(s) identifié(s)
        </p>
      </div>

      {domains.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', opacity: 0.3, marginBottom: 12 }}>
            <Tag size={28} /><GitMerge size={28} />
          </div>
          <div style={{ fontSize: 13 }}>Les domaines apparaîtront après l'analyse des premiers documents</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {domains.map(d => (
            <div key={d.id} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{d.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: 'var(--text-muted)' }}>
                  <FileText size={11} />
                  {d.doc_count}
                </div>
              </div>
              {d.aliases?.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {d.aliases.slice(0, 4).map((a: string) => (
                    <span key={a} style={{ fontSize: 10, color: 'var(--text-muted)',
                      background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 3 }}>{a}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
