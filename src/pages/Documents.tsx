import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, Clock, CheckCircle, XCircle, RefreshCw, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import { api, DocumentRow } from '../api/client'

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending:    { icon: Clock,       color: '#6b7280', label: 'En attente' },
  processing: { icon: RefreshCw,   color: '#d97706', label: 'Analyse en cours…' },
  done:       { icon: CheckCircle, color: '#16a34a', label: 'Analysé' },
  error:      { icon: XCircle,     color: '#dc2626', label: 'Erreur' },
}

export default function Documents() {
  const navigate = useNavigate()
  const [dragging, setDragging] = useState(false)
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
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

  useEffect(() => { loadDocs() }, [loadDocs])

  useEffect(() => {
    const interval = setInterval(() => {
      const hasActive = docs.some(d => d.job_status === 'pending' || d.job_status === 'processing')
      if (hasActive) loadDocs()
    }, 6000)
    return () => clearInterval(interval)
  }, [docs, loadDocs])

  const handleRetry = async (docId: string) => {
    try {
      await api.retryDocument(docId)
      await loadDocs()
    } catch (err) {
      alert('Erreur lors du relancement : ' + String(err))
    }
  }

  const handleDelete = async (docId: string) => {
    try {
      await api.deleteDocument(docId)
      setConfirmDelete(null)
      await loadDocs()
    } catch (err) {
      alert('Erreur lors de la suppression : ' + String(err))
    }
  }

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
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, marginBottom: 6 }}>Documents</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
            {docs.length} document(s) · Analyse IA automatique
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
          background: dragging ? 'rgba(59,98,212,0.03)' : 'var(--bg-2)',
          cursor: uploading ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10, padding: 36,
          marginBottom: 16, transition: 'all 0.15s' }}>
        <Upload size={26} color={dragging ? 'var(--accent)' : 'var(--text-muted)'} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>
            {uploading ? 'Upload en cours…' : 'Glissez vos PDFs ici ou cliquez'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Plusieurs fichiers acceptés · Max 50 MB</div>
        </div>
        <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {uploadMsg && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg-3)',
          borderRadius: 8, fontSize: 14, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {uploadMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Chargement…</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <FileText size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>Aucun document importé</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(doc => {
            const st = doc.job_status || 'pending'
            const { icon: StatusIcon, color, label } = statusConfig[st] || statusConfig['pending']
            const isStuck = st === 'processing' || st === 'error'

            return (
              <div key={doc.id} className="card" style={{ padding: '16px 20px' }}>
                {/* Ligne principale */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => st === 'done' && navigate(`/documents/${doc.id}`)}>
                  <FileText size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      color: st === 'done' ? 'var(--accent)' : 'var(--text)' }}>
                      {doc.title || doc.file_name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {doc.year && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{doc.year}</span>}
                      {doc.n_grade && <span className={`badge badge-${doc.n_grade}`}>{doc.n_grade}</span>}
                      {doc.domains?.slice(0, 3).map((d: string) => (
                        <span key={d} style={{ fontSize: 12, color: 'var(--accent)',
                          background: 'rgba(59,98,212,0.08)', padding: '1px 7px', borderRadius: 4 }}>{d}</span>
                      ))}
                    </div>
                  </div>

                  {/* Status + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color, fontSize: 13 }}>
                      <StatusIcon size={14} />
                      {label}
                    </div>

                    {/* Bouton Relancer */}
                    {isStuck && (
                      <button
                        onClick={e => { e.stopPropagation(); handleRetry(doc.id) }}
                        className="btn btn-ghost"
                        title="Relancer l'analyse"
                        style={{ padding: '5px 10px', fontSize: 12, gap: 5,
                          color: '#d97706', borderColor: '#fde68a' }}>
                        <RotateCcw size={13} /> Relancer
                      </button>
                    )}

                    {/* Bouton Supprimer */}
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDelete(doc.id) }}
                      className="btn btn-ghost"
                      title="Supprimer"
                      style={{ padding: '5px 8px', color: '#dc2626', borderColor: '#fecaca' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Erreur détaillée */}
                {st === 'error' && doc.job_error && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#fef2f2',
                    border: '1px solid #fecaca', borderRadius: 8, fontSize: 13,
                    color: '#7f1d1d', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {doc.job_error.slice(0, 300)}{doc.job_error.length > 300 ? '…' : ''}
                  </div>
                )}

                {/* Confirmation suppression */}
                {confirmDelete === doc.id && (
                  <div style={{ marginTop: 10, padding: '12px 14px', background: '#fef2f2',
                    border: '1px solid #fecaca', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 14, color: '#7f1d1d' }}>
                      <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Supprimer définitivement ce document ?
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setConfirmDelete(null)} className="btn btn-ghost"
                        style={{ padding: '5px 12px', fontSize: 13 }}>Annuler</button>
                      <button onClick={() => handleDelete(doc.id)} className="btn btn-primary"
                        style={{ padding: '5px 12px', fontSize: 13, background: '#dc2626' }}>
                        Supprimer
                      </button>
                    </div>
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
