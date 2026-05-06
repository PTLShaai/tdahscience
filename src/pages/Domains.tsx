import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, GitMerge, FileText, ChevronRight } from 'lucide-react'
import { api } from '../api/client'

interface Domain { id: string; slug: string; label: string; doc_count: number; aliases: string[] }

export default function Domains() {
  const navigate = useNavigate()
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDomains().then(d => setDomains(d as Domain[])).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>
          Domaines de recherche
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {domains.length} domaine(s) · Cliquez pour explorer la littérature associée
        </p>
      </div>

      {domains.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', opacity: 0.3, marginBottom: 12 }}>
            <Tag size={28} /><GitMerge size={28} />
          </div>
          <div style={{ fontSize: 14 }}>Les domaines apparaîtront après l'analyse des premiers documents</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {domains.sort((a,b) => b.doc_count - a.doc_count).map(d => (
            <div key={d.id} className="card" style={{ padding: '16px 20px', cursor: 'pointer',
              transition: 'border-color 0.12s, box-shadow 0.12s', display: 'flex',
              alignItems: 'center', gap: 16 }}
              onClick={() => navigate(`/domains/${d.slug}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,98,212,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,98,212,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Tag size={16} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{d.label}</div>
                {d.aliases?.length > 1 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Aussi : {d.aliases.slice(0,3).join(', ')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
                <FileText size={13} />
                {d.doc_count} article{d.doc_count > 1 ? 's' : ''}
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
