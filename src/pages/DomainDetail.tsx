import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Users, TrendingUp, BookOpen, AlertTriangle } from 'lucide-react'
import { api } from '../api/client'

interface DomainDoc {
  id: string; title: string | null; file_name: string; year: number | null
  n_grade: string | null; study_type: string | null; validation_status: string | null
  key_findings_literal: string[]; university_flag: boolean; total_n: number | null
}
interface DomainDetail {
  id: string; slug: string; label: string; doc_count: number
  documents: DomainDoc[]
}

const gradeOrder = ['A','B','C','D','E','F']
const gradeLabel: Record<string, string> = {
  A:'1000+', B:'200–999', C:'50–199', D:'20–49', E:'10–19', F:'<10'
}

export default function DomainDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<DomainDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview'|'papers'|'findings'>('overview')

  useEffect(() => {
    if (!slug) return
    api.getDomainBySlug(slug)
      .then(d => setData(d as DomainDetail))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>
  if (!data)   return <div style={{ padding: 32, color: 'var(--accent-danger)' }}>Domaine introuvable</div>

  const docs = data.documents || []
  const byYear = docs.reduce((acc, d) => {
    if (d.year) acc[d.year] = (acc[d.year] || 0) + 1
    return acc
  }, {} as Record<number, number>)
  const years = Object.keys(byYear).map(Number).sort()
  const maxCount = Math.max(...Object.values(byYear), 1)

  const gradeDistrib = gradeOrder.reduce((acc, g) => {
    acc[g] = docs.filter(d => d.n_grade === g).length
    return acc
  }, {} as Record<string, number>)

  const studyTypes = docs.reduce((acc, d) => {
    if (d.study_type) acc[d.study_type] = (acc[d.study_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const allFindings = docs.flatMap(d =>
    (d.key_findings_literal || []).map(f => ({ finding: f, doc: d }))
  )

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'papers',   label: `Articles (${docs.length})` },
    { id: 'findings', label: `Résultats clés (${allFindings.length})` },
  ] as const

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <button onClick={() => navigate('/domains')} className="btn btn-ghost"
        style={{ marginBottom: 20, gap: 6 }}>
        <ArrowLeft size={14} /> Retour aux domaines
      </button>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, marginBottom: 6 }}>
          {data.label}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {docs.length} article(s) dans ce domaine
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '10px 20px', background: 'none', border: 'none',
              fontSize: 14, fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer', transition: 'all 0.12s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Timeline */}
          {years.length > 0 && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
                fontSize: 14, fontWeight: 600 }}>
                <TrendingUp size={16} color="var(--accent)" /> Publications par année
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                {years.map(y => (
                  <div key={y} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', background: 'var(--accent)',
                      borderRadius: '4px 4px 0 0', opacity: 0.8,
                      height: `${(byYear[y] / maxCount) * 80}px`, minHeight: 4 }} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', transform: 'rotate(-45deg)',
                      transformOrigin: 'top center', marginTop: 4 }}>{y}</span>
                  </div>
                ))}
              </div>
              {years.length === 1 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Un seul article pour l'instant — les tendances apparaîtront avec plus de données.
                </div>
              )}
            </div>
          )}

          {/* Distribution grades */}
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Users size={15} color="var(--accent-2)" /> Taille des populations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gradeOrder.filter(g => gradeDistrib[g] > 0).map(g => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge badge-${g}`} style={{ width: 24, justifyContent: 'center' }}>{g}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 4,
                      width: `${(gradeDistrib[g] / docs.length) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 60 }}>
                    {gradeLabel[g]}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, width: 20, textAlign: 'right' }}>
                    {gradeDistrib[g]}
                  </span>
                </div>
              ))}
              {gradeOrder.every(g => !gradeDistrib[g]) && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Données de population non disponibles
                </div>
              )}
            </div>
          </div>

          {/* Types d'études */}
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <BookOpen size={15} color="#a78bfa" /> Types d'études
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(studyTypes).sort(([,a],[,b]) => b-a).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>
                    {type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ width: 60, height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#a78bfa', borderRadius: 3,
                      width: `${(count / docs.length) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, width: 20, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
              {Object.keys(studyTypes).length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Non disponible</div>
              )}
            </div>
          </div>

          {/* Flag universitaire */}
          {docs.some(d => d.university_flag) && (
            <div className="card" style={{ gridColumn: '1 / -1',
              borderColor: 'rgba(217,119,6,0.3)', background: 'rgba(217,119,6,0.04)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="var(--accent-warn)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-warn)', marginBottom: 4 }}>
                    Recrutement universitaire détecté dans {docs.filter(d => d.university_flag).length} article(s)
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Des articles de ce domaine utilisent des échantillons d'étudiants universitaires,
                    ce qui peut limiter la généralisabilité des résultats.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Papers */}
      {activeTab === 'papers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.sort((a,b) => (b.year||0)-(a.year||0)).map(doc => (
            <div key={doc.id} className="card" style={{ padding: '14px 18px', cursor: 'pointer',
              transition: 'border-color 0.12s' }}
              onClick={() => navigate(`/documents/${doc.id}`)}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <FileText size={15} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                    {doc.title || doc.file_name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {doc.year && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.year}</span>}
                    {doc.n_grade && <span className={`badge badge-${doc.n_grade}`}>{doc.n_grade}</span>}
                    {doc.study_type && (
                      <span style={{ fontSize: 11, background: 'var(--bg-3)', color: 'var(--text-muted)',
                        padding: '1px 7px', borderRadius: 4 }}>{doc.study_type.replace(/_/g,' ')}</span>
                    )}
                    {doc.university_flag && (
                      <span style={{ fontSize: 11, color: 'var(--accent-warn)', display: 'flex',
                        alignItems: 'center', gap: 3 }}>
                        <AlertTriangle size={10} /> recrutement univ.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Findings */}
      {activeTab === 'findings' && (
        <div>
          {allFindings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              Aucun résultat extrait pour ce domaine
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allFindings.map(({ finding, doc }, i) => (
                <div key={i} style={{ padding: '14px 18px', background: 'var(--bg-2)',
                  border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
                  borderRadius: '0 var(--radius-lg) var(--radius-lg) 0' }}>
                  <div style={{ fontSize: 14, fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>
                    "{finding}"
                  </div>
                  <button onClick={() => navigate(`/documents/${doc.id}`)}
                    style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none',
                      cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={11} />
                    {doc.title || doc.file_name}
                    {doc.year ? ` (${doc.year})` : ''}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
