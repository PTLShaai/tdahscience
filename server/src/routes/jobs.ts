import { Router, Response } from 'express'
import { query } from '../db/connection'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// GET /api/jobs — état de la file
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await query(`
      SELECT
        ij.id, ij.status, ij.attempt_count, ij.error_message,
        ij.created_at, ij.started_at, ij.completed_at,
        d.file_name, d.title,
        t.label as topic_label
      FROM import_jobs ij
      JOIN documents d ON ij.document_id = d.id
      LEFT JOIN topics t ON ij.topic_id = t.id
      ORDER BY ij.created_at DESC
      LIMIT 100
    `)
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/jobs/stats — compteurs par statut
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await query(`
      SELECT status, COUNT(*)::int as count
      FROM import_jobs
      GROUP BY status
    `)
    const stats: Record<string, number> = {}
    for (const row of rows as Array<{ status: string; count: number }>) {
      stats[row.status] = row.count
    }
    res.json(stats)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
