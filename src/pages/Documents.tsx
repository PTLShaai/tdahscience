import { useState, useRef } from 'react'
import { Upload, FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

type JobStatus = 'pending' | 'processing' | 'done' | 'error'

interface DocRow {
  id: string
  title: string
  year?: number
  status: JobStatus
  n_grade?: string
  domains?: string[]
  error?: string
}

const statusConfig: Record<JobStatus, { icon: typeof Clock; color: string; label: string }> = {
  pending:    { icon: Clock,         color: 'var(--text-muted)', label: 'En attente' },
  processing: { icon: Clock,         color: 'var(--accent-warn)', label: 'Analyse…' },
  done:       { icon: CheckCircle,   color: 'var(--accent-2)',   label: 'Analysé' },
  error:      { icon: XCircle,       color: 'var(--accent-danger)', label: 'Erreur' },
}

export default function Documents() {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [docs] = useState<DocRow[]>([])

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf')
    if (pdfs.length === 0) return
    // TODO: upload via API
    console.log('Files to upload:', pdfs.map(f => f.name))
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>
          Documents
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Importez vos PDFs scientifiques — l'analyse est effectuée automatiquement
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="card"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        style={{
          borderStyle: 'dashed',
          borderColor: dragging ? 'var(--accent)' : 'var(--border)',
          background: dragging ? 'rgba(91,141,238,0.04)' : 'var(--bg-2)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: 40,
          marginBottom: 24,
          transition: 'all 0.15s',
        }}
      >
        <Upload size={28} color={dragging ? 'var(--accent)' : 'var(--text-muted)'} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            Glissez vos PDFs ici ou cliquez pour sélectionner
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Plusieurs fichiers acceptés — traitement par batch
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Documents list */}
      {docs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 0',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}>
          <FileText size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>Aucun document importé</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(doc => {
            const { icon: StatusIcon, color, label } = statusConfig[doc.status]
            return (
              <div key={doc.id} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.title}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                      {doc.year && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.year}</span>}
                      {doc.n_grade && (
                        <span className={`badge badge-${doc.n_grade}`}>{doc.n_grade}</span>
                      )}
                      {doc.domains?.slice(0, 3).map(d => (
                        <span key={d} style={{
                          fontSize: 11,
                          color: 'var(--accent)',
                          background: 'rgba(91,141,238,0.1)',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color, fontSize: 12, flexShrink: 0 }}>
                    <StatusIcon size={13} />
                    {label}
                  </div>
                </div>
                {doc.error && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, color: 'var(--accent-danger)', fontSize: 12 }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                    {doc.error}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
