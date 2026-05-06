import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, FileText, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { api, DocumentRow } from '../api/client'

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending:    { icon: Clock,       color: 'var(--text-muted)',    label: 'En attente' },
  processing: { icon: RefreshCw,   color: 'var(--accent-warn)',   label: 'Analyse…' },
  done:       { icon: CheckCircle, color: 'var(--accent-2)',      label: 'Analysé' },
  error:      { icon: XCircle,     color: 'var(--accent-danger)', label: 'Erreur' },
}

export default function Documents() {
  const [dragging, setDragging] = useState(false)
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    try {
      const data = await api.getDocuments()
      setDocs(data)
    } catch (err) {
      console.error('Erreur chargement docs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  // Polling séparé — uniquement si des jobs sont en cours
  useEffect(() => {
    const interval = setInterval(() => {
      const hasActive = docs.some(d => d.job_status === 'pending' || d.job_status === 'processing')
      if (hasActive) loadDocs()
    }, 6000)
    return () => clearInterval(interval)
  }, [docs, loadDocs])

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf')
    if (pdfs.length === 0) return
    setUploading(true)
    setUploadMsg(`Upload de ${pdfs.length} fichier(s)…`)
    try {
      const result = await api.uploadPdfs(pdfs)
      const queued = result.results.filter(r => r.status === 'queued').length
      const dupes  = result.results.filter(r => r.status === 'duplicate').length
      const errors = result.results.filter(r => r.status === 'error').length
      setUploadMsg(`${queued} en queue${dupes ? ` · ${dupes} doublon(s)` : ''}${errors ? ` · ${errors} erreur(s)` : ''}`)
      await loadDocs()
      setTimeout(() => setUploadMsg(''), 5000)
    } catch (err) {
      setUploadMsg(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>Documents</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Importez vos PDFs — l'analyse IA démarre automatiquement
          </p>
        </div>
        <button onClick={loadDocs} className="btn btn-ghost"><RefreshCw size={14} /> Actualiser</button>
      </div>

      {/* Drop zone */}
      <div className="card"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{ borderStyle: 'dashed', borderColor: dragging ? 'var(--accent)' : 'var(--border)',
          background: dragging ? 'rgba(91,141,238,0.04)' : 'var(--bg-2)', cursor: uploading ? 'wait' : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: 36, marginBottom: 16, transition: 'all 0.15s' }}>
        <Upload size={26} color={dragging ? 'var(--accent)' : 'var(--text-muted)'} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>
            {uploading ? 'Upload en cours…' : 'Glissez vos PDFs ici ou cliquez'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Plusieurs fichiers acceptés</div>
        </div>
        <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {uploadMsg && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg-3)',
          borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {uploadMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Chargement…
        </div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <FileText size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>Aucun document importé</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map(doc => {
            const st = doc.job_status || 'pending'
            const { icon: StatusIcon, color, label } = statusConfig[st] || statusConfig['pending']
            return (
              <div key={doc.id} className="card" style={{ padding: '13px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.title || doc.file_name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {doc.year && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.year}</span>}
                      {doc.n_grade && <span className={`badge badge-${doc.n_grade}`}>{doc.n_grade}</span>}
                      {doc.domains?.slice(0, 4).map((d: string) => (
                        <span key={d} style={{ fontSize: 11, color: 'var(--accent)',
                          background: 'rgba(91,141,238,0.1)', padding: '1px 6px', borderRadius: 4 }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color, fontSize: 12, flexShrink: 0 }}>
                    <StatusIcon size={13} />
                    {label}
                  </div>
                </div>
                {doc.validation_status === 'uncertain' && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, color: 'var(--accent-warn)', fontSize: 12 }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                    Certains champs nécessitent une vérification manuelle
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
