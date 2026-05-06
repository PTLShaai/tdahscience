import { Router, Response } from 'express'
import { query } from '../db/connection'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// GET /api/topics — tous les sujets disponibles
router.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const topics = await query('SELECT * FROM topics ORDER BY label')
    res.json(topics)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/topics/mine — sujets de l'utilisateur connecté
router.get('/mine', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topics = await query(
      `SELECT t.* FROM topics t
       JOIN user_topics ut ON t.id = ut.topic_id
       WHERE ut.user_id = $1
       ORDER BY t.label`,
      [req.userId]
    )
    res.json(topics)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/topics/:id/subscribe — s'abonner à un sujet
router.post('/:id/subscribe', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await query(
      'INSERT INTO user_topics (user_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.userId, req.params.id]
    )
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/topics/:id/subscribe — se désabonner
router.delete('/:id/subscribe', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await query(
      'DELETE FROM user_topics WHERE user_id = $1 AND topic_id = $2',
      [req.userId, req.params.id]
    )
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
