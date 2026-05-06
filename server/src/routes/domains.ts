import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// GET /api/domains — tous les domaines normalisés
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const domains = await query(`
      SELECT rd.*,
        COUNT(DISTINCT dd.document_id)::int as doc_count,
        COALESCE(
          json_agg(da.raw_label) FILTER (WHERE da.raw_label IS NOT NULL),
          '[]'
        ) as aliases
      FROM research_domains rd
      LEFT JOIN document_domains dd ON rd.id = dd.domain_id
      LEFT JOIN domain_aliases da ON rd.id = da.domain_id
      GROUP BY rd.id
      ORDER BY doc_count DESC, rd.label
    `)
    res.json(domains)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/domains/unresolved — raw_labels non encore normalisés
router.get('/unresolved', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query(`
      SELECT dd.raw_label, COUNT(*)::int as count
      FROM document_domains dd
      WHERE dd.domain_id IS NULL
        AND dd.raw_label IS NOT NULL
      GROUP BY dd.raw_label
      ORDER BY count DESC
    `)
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/domains — créer un domaine
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { slug, label, parent_id } = req.body
  if (!slug || !label) {
    res.status(400).json({ error: 'slug et label requis' })
    return
  }
  try {
    const rows = await query(
      'INSERT INTO research_domains (slug, label, parent_id) VALUES ($1, $2, $3) RETURNING *',
      [slug, label, parent_id || null]
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Slug déjà existant ou erreur serveur' })
  }
})

// POST /api/domains/:id/alias — ajouter un alias et résoudre les docs
router.post('/:id/alias', async (req: Request, res: Response): Promise<void> => {
  const { raw_label } = req.body
  if (!raw_label) {
    res.status(400).json({ error: 'raw_label requis' })
    return
  }
  try {
    // Créer l'alias
    await query(
      'INSERT INTO domain_aliases (raw_label, domain_id) VALUES ($1, $2) ON CONFLICT (raw_label) DO UPDATE SET domain_id = $2',
      [raw_label, req.params.id]
    )
    // Résoudre rétroactivement les document_domains non liés
    const result = await query<{ count: string }>(
      `UPDATE document_domains
       SET domain_id = $1
       WHERE raw_label = $2 AND domain_id IS NULL
       RETURNING document_id`,
      [req.params.id, raw_label]
    )
    res.json({ ok: true, resolved: result.length })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/domains/trends — tendances par année
router.get('/trends', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query(`
      SELECT
        d.year,
        rd.label as domain,
        rd.slug,
        COUNT(*)::int as paper_count
      FROM documents d
      JOIN document_domains dd ON d.id = dd.document_id
      JOIN research_domains rd ON dd.domain_id = rd.id
      WHERE d.year IS NOT NULL
      GROUP BY d.year, rd.id, rd.label, rd.slug
      ORDER BY d.year, paper_count DESC
    `)
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router

// GET /api/domains/:slug — détail d'un domaine + documents associés
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<{ id: string; slug: string; label: string; doc_count: number }>(
      `SELECT rd.id, rd.slug, rd.label,
              COUNT(DISTINCT dd.document_id)::int as doc_count
       FROM research_domains rd
       LEFT JOIN document_domains dd ON rd.id = dd.domain_id
       WHERE rd.slug = $1
       GROUP BY rd.id`,
      [req.params.slug]
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Domaine introuvable' })
      return
    }

    const domain = rows[0]

    const docs = await query(
      `SELECT d.id, d.title, d.file_name, d.year, d.study_type,
              da.n_grade, da.validation_status, da.university_flag,
              da.total_n, da.key_findings_literal
       FROM documents d
       JOIN document_domains dd ON d.id = dd.document_id
       LEFT JOIN document_analyses da ON d.id = da.document_id
       WHERE dd.domain_id = $1
       ORDER BY d.year DESC NULLS LAST`,
      [domain.id]
    )

    res.json({ ...domain, documents: docs })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
