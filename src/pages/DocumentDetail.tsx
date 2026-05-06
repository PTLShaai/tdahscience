import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Download, AlertTriangle, CheckCircle, Users,
         Calendar, BookOpen, Globe, FlaskConical, FileText } from 'lucide-react'
import { api } from '../api/client'

interface Analysis {
  id: string
  title: string | null
  year: number | null
  journal: string | null
  study_type: string | null
  file_name: string
  file_path: string
  doi: string | null
  authors: string[]

  // Population
  total_n: number | null
  analysis_n: number | null
  n_grade: string | null
  age_min: number | null
  age_max: number | null
  age_range_literal: string | null
  diagnosis_context_literal: string | null
  recruitment_type: string | null
  university_flag: boolean
  multi_site: boolean | null
  geographic_context: string | null
  control_group: boolean | null
  sex_breakdown_literal: string | null

  // Qualité
  structured_diagnostic_tool: boolean | null
  diagnostic_tool_name: string | null
  multiple_informants: boolean | null
  randomized: boolean | null
  longitudinal: boolean | null

  // Résultats
  medications_studied: string[]
  key_findings_literal: string[]
  limitations_literal: string[]
  uncertain_fields: string[]
  extraction_confidence: string
  validation_status: string

  // Domaines
  domains: Array<{ slug: string; label: string }>
}

function Field({ label, value, uncertain }: { label: string; value: React.ReactNode; uncertain?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, color: uncertain ? 'var(--accent-warn)' : 'var(--text-muted)',
        marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
        {uncertain && <AlertTriangle size={10} />}
        {label}
      </div>
      <div style={{ fontSize: 15, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function BoolBadge({ value }: { value: boolean | null }) {
  if (value === null) return <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>—</span>
  return (
    <span style={{ fontSize: 15, fontWeight: 500, color: value ? 'var(--accent-2)' : 'var(--text-muted)' }}>
      {value ? '✓ Oui' : '✗ Non'}
    </span>
  )
}

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.getDocument(id)
      .then(d => setDoc(d as Analysis))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>
  if (!doc)    return <div style={{ padding: 32, color: 'var(--accent-danger)' }}>Document introuvable</div>

  const isUncertain = (field: string) => doc.uncertain_fields?.includes(field)
  const pdfUrl = `/uploads/${doc.file_path.split('/').pop()}`

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => navigate('/documents')} className="btn btn-ghost"
          style={{ marginBottom: 16, gap: 6 }}>
          <ArrowLeft size={14} /> Retour
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.3, marginBottom: 8 }}>
              {doc.title || doc.file_name}
            </h1>
            {doc.authors?.length > 0 && (
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 6 }}>
                {doc.authors.slice(0, 4).join(', ')}{doc.authors.length > 4 ? ' et al.' : ''}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {doc.year && <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>{doc.year}</span>}
              {doc.journal && <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>{doc.journal}</span>}
              {doc.doi && (
                <a href={`https://doi.org/${doc.doi}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 15, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  DOI <ExternalLink size={10} />
                </a>
              )}
              {doc.n_grade && <span className={`badge badge-${doc.n_grade}`}>{doc.n_grade}</span>}
              {doc.validation_status === 'uncertain' && (
                <span style={{ fontSize: 15, color: 'var(--accent-warn)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <AlertTriangle size={11} /> Vérification conseillée
                </span>
              )}
              {doc.validation_status === 'validated' && (
                <span style={{ fontSize: 15, color: 'var(--accent-2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <CheckCircle size={11} /> Validé
                </span>
              )}
            </div>
          </div>
          {/* Accès PDF */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ gap: 6 }}>
              <ExternalLink size={13} /> Ouvrir PDF
            </a>
            <a href={pdfUrl} download={doc.file_name} className="btn btn-ghost" style={{ gap: 6 }}>
              <Download size={13} /> Télécharger
            </a>
          </div>
        </div>
      </div>

      {/* Domaines */}
      {doc.domains?.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {doc.domains.map(d => (
            <span key={d.slug} style={{ fontSize: 15, color: 'var(--accent)',
              background: 'rgba(91,141,238,0.1)', padding: '3px 10px', borderRadius: 20,
              border: '1px solid rgba(91,141,238,0.2)' }}>{d.label}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Population */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16,
            fontSize: 15, fontWeight: 600 }}>
            <Users size={15} color="var(--accent)" /> Population
          </div>
          <Field label="Type d'étude" value={doc.study_type} />
          <Field label="N total" value={doc.total_n?.toLocaleString()} uncertain={isUncertain('total_n')} />
          <Field label="N analysés" value={doc.analysis_n?.toLocaleString()} uncertain={isUncertain('analysis_n')} />
          <Field label="Grade population" value={doc.n_grade ? (
            <span className={`badge badge-${doc.n_grade}`}>{doc.n_grade}</span>
          ) : null} />
          <Field label="Tranche d'âge" value={doc.age_range_literal} uncertain={isUncertain('age_range_literal')} />
          <Field label="Contexte diagnostic" value={doc.diagnosis_context_literal} uncertain={isUncertain('diagnosis_context_literal')} />
          <Field label="Recrutement" value={doc.recruitment_type} />
          {doc.university_flag && (
            <div style={{ fontSize: 15, color: 'var(--accent-warn)', display: 'flex', gap: 4,
              alignItems: 'center', marginTop: 8, padding: '6px 8px', background: '#332a1310', borderRadius: 6 }}>
              <AlertTriangle size={12} /> Recrutement universitaire détecté
            </div>
          )}
          <Field label="Contexte géographique" value={doc.geographic_context} uncertain={isUncertain('geographic_context')} />
          <Field label="Répartition sexe" value={doc.sex_breakdown_literal} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 3 }}>Multi-site</div>
              <BoolBadge value={doc.multi_site} />
            </div>
            <div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 3 }}>Groupe contrôle</div>
              <BoolBadge value={doc.control_group} />
            </div>
          </div>
        </div>

        {/* Qualité de preuve */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16,
            fontSize: 15, fontWeight: 600 }}>
            <FlaskConical size={15} color="var(--accent-2)" /> Qualité de preuve
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 3 }}>Outil diagnostique structuré</div>
              <BoolBadge value={doc.structured_diagnostic_tool} />
              {doc.diagnostic_tool_name && (
                <div style={{ fontSize: 15, color: 'var(--accent)', marginTop: 2 }}>{doc.diagnostic_tool_name}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 3 }}>Informateurs multiples</div>
              <BoolBadge value={doc.multiple_informants} />
            </div>
            <div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 3 }}>Randomisé</div>
              <BoolBadge value={doc.randomized} />
            </div>
            <div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 3 }}>Longitudinal</div>
              <BoolBadge value={doc.longitudinal} />
            </div>
          </div>
          {doc.medications_studied?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 6 }}>Médicaments étudiés</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {doc.medications_studied.map(m => (
                  <span key={m} style={{ fontSize: 15, background: 'rgba(61,214,140,0.1)',
                    color: 'var(--accent-2)', padding: '2px 8px', borderRadius: 4 }}>{m}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 4 }}>Confiance extraction IA</div>
            <span style={{ fontSize: 15, fontWeight: 500,
              color: doc.extraction_confidence === 'high' ? 'var(--accent-2)' :
                     doc.extraction_confidence === 'medium' ? 'var(--accent-warn)' : 'var(--accent-danger)' }}>
              {doc.extraction_confidence || '—'}
            </span>
          </div>
        </div>

        {/* Résultats clés */}
        {doc.key_findings_literal?.length > 0 && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16,
              fontSize: 15, fontWeight: 600 }}>
              <BookOpen size={15} color="#a78bfa" /> Résultats clés extraits
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {doc.key_findings_literal.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px',
                  background: 'var(--bg-3)', borderRadius: 8, fontSize: 15 }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                  <span style={{ fontStyle: 'italic', color: 'var(--text)' }}>"{f}"</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Limitations */}
        {doc.limitations_literal?.length > 0 && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16,
              fontSize: 15, fontWeight: 600 }}>
              <AlertTriangle size={15} color="var(--accent-warn)" /> Limitations identifiées
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {doc.limitations_literal.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 15,
                  padding: '8px 12px', background: 'rgba(245,166,35,0.05)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--accent-warn)', flexShrink: 0 }}>•</span>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Champs incertains */}
        {doc.uncertain_fields?.length > 0 && (
          <div className="card" style={{ gridColumn: '1 / -1',
            borderColor: 'rgba(245,166,35,0.3)', background: 'rgba(245,166,35,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10,
              fontSize: 15, fontWeight: 600, color: 'var(--accent-warn)' }}>
              <AlertTriangle size={15} /> Champs à vérifier manuellement
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {doc.uncertain_fields.map(f => (
                <span key={f} style={{ fontSize: 15, background: 'rgba(245,166,35,0.1)',
                  color: 'var(--accent-warn)', padding: '2px 8px', borderRadius: 4 }}>{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
