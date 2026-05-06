import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { query } from '../db/connection'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { config } from '../config'

const router = Router()
router.use(requireAuth)

// Config multer — stockage sur disque
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(config.uploadsDir, { recursive: true })
    cb(null, config.uploadsDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés'))
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
})

// Calcul du hash SHA-256 d'un fichier
function fileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    fs.createReadStream(filePath)
      .on('data', d => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

// POST /api/documents/upload — upload un ou plusieurs PDFs
router.post('/upload', upload.array('files', 20), async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[]
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'Aucun fichier fourni' })
    return
  }

  const topicId = req.body.topic_id || null
  const results = []

  for (const file of files) {
    try {
      const hash = await fileHash(file.path)

      // Vérifier si le doc existe déjà (via hash)
      const existing = await query<{ id: string }>(
        'SELECT id FROM documents WHERE file_hash = $1',
        [hash]
      )

      let docId: string

      if (existing.length > 0) {
        // Document déjà connu — on supprime le doublon
        fs.unlinkSync(file.path)
        docId = existing[0].id
        results.push({ file: file.originalname, status: 'duplicate', docId })
      } else {
        // Nouveau document
        const rows = await query<{ id: string }>(
          `INSERT INTO documents (file_hash, file_path, file_name, imported_by)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [hash, file.path, file.originalname, req.userId]
        )
        docId = rows[0].id

        // Créer un job d'analyse
        await query(
          `INSERT INTO import_jobs (document_id, topic_id) VALUES ($1, $2)`,
          [docId, topicId]
        )

        // Lier au sujet si fourni
        if (topicId) {
          await query(
            `INSERT INTO document_topics (document_id, topic_id, added_by)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [docId, topicId, req.userId]
          )
        }

        results.push({ file: file.originalname, status: 'queued', docId })
      }
    } catch (err) {
      results.push({ file: file.originalname, status: 'error', error: String(err) })
    }
  }

  res.json({ results })
})

// GET /api/documents — liste des documents
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { topic_id } = req.query
  try {
    let sql = `
      SELECT d.id, d.title, d.year, d.journal, d.study_type, d.file_name,
             da.n_grade, da.validation_status, da.extraction_confidence,
             ij.status as job_status, ij.error_message as job_error, ij.attempt_count,
             COALESCE(
               (SELECT json_agg(rd.label)
                FROM document_domains dd
                JOIN research_domains rd ON dd.domain_id = rd.id
                WHERE dd.document_id = d.id),
               '[]'
             ) as domains
      FROM documents d
      LEFT JOIN document_analyses da ON d.id = da.document_id
      LEFT JOIN LATERAL (
        SELECT status, error_message, attempt_count FROM import_jobs
        WHERE document_id = d.id
        ORDER BY created_at DESC LIMIT 1
      ) ij ON true
    `
    const params: unknown[] = []

    if (topic_id) {
      sql += ` JOIN document_topics dt ON d.id = dt.document_id WHERE dt.topic_id = $1`
      params.push(topic_id)
    }

    sql += ' ORDER BY d.created_at DESC'

    const docs = await query(sql, params)
    res.json(docs)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/documents/:id — détail d'un document
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await query(
      `SELECT d.*, da.*,
              COALESCE(
                (SELECT json_agg(json_build_object('slug', rd.slug, 'label', rd.label))
                 FROM document_domains dd
                 JOIN research_domains rd ON dd.domain_id = rd.id
                 WHERE dd.document_id = d.id),
                '[]'
              ) as domains
       FROM documents d
       LEFT JOIN document_analyses da ON d.id = da.document_id
       WHERE d.id = $1`,
      [req.params.id]
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Document introuvable' })
      return
    }
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router

// POST /api/documents/:id/retry — relancer l'analyse d'un doc en erreur
router.post('/:id/retry', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query<{ id: string }>(
      `UPDATE import_jobs
       SET status = 'pending', attempt_count = 0, error_message = NULL, started_at = NULL
       WHERE document_id = $1 AND status IN ('error', 'processing')
       RETURNING id`,
      [req.params.id]
    )
    if (result.length === 0) {
      res.status(404).json({ error: 'Aucun job en erreur pour ce document' })
      return
    }
    res.json({ ok: true, job_id: result[0].id })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
