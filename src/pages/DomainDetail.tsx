import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Users, TrendingUp, BookOpen, AlertTriangle,
         Download, CheckSquare, Square, Filter, X } from 'lucide-react'
import { api } from '../api/client'

interface DomainDoc {
  id: string; title: string | null; file_name: string; year: number | null
  n_grade: string | null; study_type: string | null; validation_status: string | null
  key_findings_literal: string[]; university_flag: boolean; total_n: number | null
}
interface DomainDetail {
  id: string; slug: string; label: string; doc_count: number; documents: DomainDoc[]
}

const GRADES = ['A','B','C','D','E','F']
const gradeLabel: Record<string,string> = { A:'1000+', B:'200-999', C:'50-199', D:'20-49', E:'10-19', F:'<10' }
const STUDY_TYPES = ['theoretical_model','systematic_review','meta_analysis','RCT','cohort','cross_sectional','epidemiological','case_study','review_narrative','qualitative']

const inputStyle = {
  background: 'var(--bg-2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 10px', fontSize: 14,
  color: 'var(--text)', outline: 'none', width: '100%',
}

export default function DomainDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<DomainDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview'|'papers'|'findings'>('overview')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterYearFrom, setFilterYearFrom] = useState('')
  const [filterYearTo, setFilterYearTo] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf'|'zip'>('pdf')

  useEffect(() => {
    if (!slug) return
    api.getDomainBySlug(slug).then(d => { setData(d as DomainDetail); setSelected(new Set()) }).catch(console.error).finally(() => setLoading(false))
  }, [slug])

  const filteredDocs = useMemo(() => {
    if (!data) return []
    return data.documents.filter(d => {
      if (filterGrade) { const gi = GRADES.indexOf(d.n_grade||'F'), mi = GRADES.indexOf(filterGrade); if (gi===-1||gi>mi) return false }
      if (filterYearFrom && d.year && d.year < parseInt(filterYearFrom)) return false
      if (filterYearTo && d.year && d.year > parseInt(filterYearTo)) return false
      if (filterType && d.study_type !== filterType) return false
      return true
    })
  }, [data, filterGrade, filterYearFrom, filterYearTo, filterType])

  const activeFilters = [filterGrade, filterYearFrom, filterYearTo, filterType].filter(Boolean).length
  const toggleSelect = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s) }
  const selectAll = () => setSelected(new Set(filteredDocs.map(d => d.id)))
  const selectNone = () => setSelected(new Set())
  const clearFilters = () => { setFilterGrade(''); setFilterYearFrom(''); setFilterYearTo(''); setFilterType('') }

  const handleExport = async () => {
    if (selected.size === 0) return
    setExporting(true)
    try {
      const blob = await api.exportDocs([...selected], exportFormat, data?.label || slug || 'export')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tdahscience_${slug}_${Date.now()}.${exportFormat === 'pdf' ? 'pdf' : 'zip'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert('Erreur export : ' + String(err)) }
    finally { setExporting(false) }
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>
  if (!data) return <div style={{ padding: 32, color: 'var(--accent-danger)' }}>Domaine introuvable</div>

  const docs = data.documents || []
  const byYear = docs.reduce((acc,d) => { if (d.year) acc[d.year]=(acc[d.year]||0)+1; return acc }, {} as Record<number,number>)
  const years = Object.keys(byYear).map(Number).sort()
  const maxCount = Math.max(...Object.values(byYear), 1)
  const gradeDistrib = GRADES.reduce((acc,g) => { acc[g]=docs.filter(d=>d.n_grade===g).length; return acc }, {} as Record<string,number>)
  const studyTypes = docs.reduce((acc,d) => { if (d.study_type) acc[d.study_type]=(acc[d.study_type]||0)+1; return acc }, {} as Record<string,number>)
  const allFindings = docs.flatMap(d => (d.key_findings_literal||[]).map(f => ({ finding: f, doc: d })))

  return (
    <div style={{ padding: 32, maxWidth: 980, margin: '0 auto' }}>
      <button onClick={() => navigate('/domains')} className="btn btn-ghost" style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> Retour
      </button>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, marginBottom: 6 }}>{data.label}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{docs.length} article(s) dans ce domaine</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
        {([['overview','Vue d\'ensemble'],['papers',`Articles (${docs.length})`],['findings',`Résultats clés (${allFindings.length})`]] as [string,string][]).map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id as 'overview'|'papers'|'findings')}
            style={{ padding: '10px 22px', background: 'none', border: 'none', fontSize: 15,
              fontWeight: activeTab===id ? 600 : 400,
              color: activeTab===id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab===id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer' }}>{label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {years.length > 0 && (
            <div className="card" style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                <TrendingUp size={16} color="var(--accent)" /> Publications par année
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                {years.map(y => (
                  <div key={y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', background: 'var(--accent)', borderRadius: '4px 4px 0 0', opacity: 0.75, height: `${(byYear[y]/maxCount)*80}px`, minHeight: 4 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top center', marginTop: 4 }}>{y}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Users size={15} color="var(--accent-2)" /> Taille des populations
            </div>
            {GRADES.filter(g=>gradeDistrib[g]>0).map(g => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className={`badge badge-${g}`} style={{ width: 24, justifyContent: 'center' }}>{g}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 4, width: `${(gradeDistrib[g]/docs.length)*100}%` }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', width: 60 }}>{gradeLabel[g]}</span>
                <span style={{ fontSize: 13, fontWeight: 500, width: 20, textAlign: 'right' }}>{gradeDistrib[g]}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <BookOpen size={15} color="#a78bfa" /> Types d'études
            </div>
            {Object.entries(studyTypes).sort(([,a],[,b])=>b-a).map(([type,count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, fontSize: 14 }}>{type.replace(/_/g,' ')}</div>
                <div style={{ width: 60, height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#a78bfa', borderRadius: 3, width: `${(count/docs.length)*100}%` }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, width: 20, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
          {docs.some(d=>d.university_flag) && (
            <div className="card" style={{ gridColumn:'1/-1', borderColor:'rgba(217,119,6,0.3)', background:'rgba(217,119,6,0.04)' }}>
              <div style={{ display:'flex', gap:10 }}>
                <AlertTriangle size={16} color="var(--accent-warn)" style={{ marginTop:2, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--accent-warn)', marginBottom:4 }}>
                    Recrutement universitaire dans {docs.filter(d=>d.university_flag).length} article(s)
                  </div>
                  <div style={{ fontSize:14, color:'var(--text-muted)' }}>Peut limiter la généralisabilité.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAPERS avec filtres + sélection + export */}
      {activeTab === 'papers' && (
        <div>
          {/* Toolbar */}
          <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-ghost"
              style={{ gap:6, color: activeFilters>0 ? 'var(--accent)' : undefined, borderColor: activeFilters>0 ? 'var(--accent)' : undefined }}>
              <Filter size={14} /> Filtres
              {activeFilters>0 && <span style={{ background:'var(--accent)', color:'#fff', borderRadius:10, fontSize:11, padding:'0 5px', fontWeight:700 }}>{activeFilters}</span>}
            </button>

            <span style={{ fontSize:14, color:'var(--text-muted)', marginLeft:'auto' }}>
              {selected.size>0 ? `${selected.size} sélectionné(s) sur ${filteredDocs.length}` : `${filteredDocs.length} article(s)`}
            </span>
            <button onClick={selectAll} className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:13, gap:5 }}>
              <CheckSquare size={13} /> Tout
            </button>
            {selected.size>0 && (
              <button onClick={selectNone} className="btn btn-ghost" style={{ padding:'6px 10px', fontSize:13 }}>
                <X size={13} />
              </button>
            )}

            {selected.size>0 && (
              <>
                <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'pdf'|'zip')}
                  style={{ ...inputStyle, width:'auto' }}>
                  <option value="pdf">PDF fusionné</option>
                  <option value="zip">ZIP</option>
                </select>
                <button onClick={handleExport} disabled={exporting} className="btn btn-primary" style={{ gap:6, opacity: exporting ? 0.7 : 1 }}>
                  <Download size={14} />
                  {exporting ? 'Génération…' : `Exporter (${selected.size})`}
                </button>
              </>
            )}
          </div>

          {/* Panneau filtres */}
          {showFilters && (
            <div className="card" style={{ marginBottom:16, padding:'16px 20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:5 }}>Grade minimum</label>
                  <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} style={inputStyle}>
                    <option value="">Tous</option>
                    {GRADES.map(g => <option key={g} value={g}>≥ {g} ({gradeLabel[g]})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:5 }}>Depuis</label>
                  <input type="number" value={filterYearFrom} onChange={e => setFilterYearFrom(e.target.value)} placeholder="2010" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:5 }}>Jusqu'à</label>
                  <input type="number" value={filterYearTo} onChange={e => setFilterYearTo(e.target.value)} placeholder="2025" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:5 }}>Type d'étude</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inputStyle}>
                    <option value="">Tous</option>
                    {STUDY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
              </div>
              {activeFilters>0 && <button onClick={clearFilters} style={{ marginTop:10, background:'none', border:'none', color:'var(--accent)', fontSize:13, cursor:'pointer', padding:0 }}>Effacer les filtres</button>}
            </div>
          )}

          {/* Liste */}
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:14 }}>Aucun article ne correspond aux filtres</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filteredDocs.sort((a,b)=>(b.year||0)-(a.year||0)).map(doc => (
                <div key={doc.id} className="card" style={{ padding:'14px 18px', borderColor: selected.has(doc.id) ? 'var(--accent)' : 'var(--border)', background: selected.has(doc.id) ? 'rgba(59,98,212,0.03)' : 'var(--bg-2)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={() => toggleSelect(doc.id)} style={{ background:'none', border:'none', padding:0, flexShrink:0, color: selected.has(doc.id) ? 'var(--accent)' : 'var(--text-muted)', cursor:'pointer' }}>
                      {selected.has(doc.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <div style={{ flex:1, cursor:'pointer' }} onClick={() => navigate(`/documents/${doc.id}`)}>
                      <div style={{ fontSize:15, fontWeight:500, marginBottom:4, color:'var(--accent)' }}>{doc.title || doc.file_name}</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                        {doc.year && <span style={{ fontSize:13, color:'var(--text-muted)' }}>{doc.year}</span>}
                        {doc.n_grade && <span className={`badge badge-${doc.n_grade}`}>{doc.n_grade}</span>}
                        {doc.study_type && <span style={{ fontSize:12, background:'var(--bg-3)', color:'var(--text-muted)', padding:'1px 7px', borderRadius:4 }}>{doc.study_type.replace(/_/g,' ')}</span>}
                        {doc.university_flag && <span style={{ fontSize:12, color:'var(--accent-warn)', display:'flex', alignItems:'center', gap:3 }}><AlertTriangle size={11} /> recrutement univ.</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FINDINGS */}
      {activeTab === 'findings' && (
        <div>
          {allFindings.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text-muted)', fontSize:14 }}>Aucun résultat extrait</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {allFindings.map(({ finding, doc }, i) => (
                <div key={i} style={{ padding:'14px 18px', background:'var(--bg-2)', border:'1px solid var(--border)', borderLeft:'3px solid var(--accent)', borderRadius:'0 var(--radius-lg) var(--radius-lg) 0' }}>
                  <div style={{ fontSize:15, fontStyle:'italic', marginBottom:8, lineHeight:1.55 }}>"{finding}"</div>
                  <button onClick={() => navigate(`/documents/${doc.id}`)} style={{ fontSize:13, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:4 }}>
                    <FileText size={12} />{doc.title || doc.file_name}{doc.year ? ` (${doc.year})` : ''}
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
