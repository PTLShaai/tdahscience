import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db/connection'
import { config } from '../config'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis' })
    return
  }
  try {
    const hash = await bcrypt.hash(password, 12)
    const rows = await query<{ id: string }>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, hash]
    )
    const token = jwt.sign({ userId: rows[0].id }, config.jwtSecret, { expiresIn: '30d' })
    res.json({ token, userId: rows[0].id })
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e.code === '23505') {
      res.status(409).json({ error: 'Email déjà utilisé' })
    } else {
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis' })
    return
  }
  try {
    const rows = await query<{ id: string; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email]
    )
    if (rows.length === 0) {
      res.status(401).json({ error: 'Identifiants incorrects' })
      return
    }
    const valid = await bcrypt.compare(password, rows[0].password_hash)
    if (!valid) {
      res.status(401).json({ error: 'Identifiants incorrects' })
      return
    }
    const token = jwt.sign({ userId: rows[0].id }, config.jwtSecret, { expiresIn: '30d' })
    res.json({ token, userId: rows[0].id })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
