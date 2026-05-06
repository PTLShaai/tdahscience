import { Router, Response } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { loadExportDocs, exportMergedPdf, exportZip } from '../services/exportService'

const router = Router()
router.use(requireAuth)

// POST /api/export
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { document_ids, format = 'pdf', domain_label = 'export' } = req.body

  if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
    res.status(400).json({ error: 'document_ids requis' })
    return
  }

  if (document_ids.length > 50) {
    res.status(400).json({ error: 'Maximum 50 documents par export' })
    return
  }

  try {
    const docs = await loadExportDocs(document_ids)
    if (docs.length === 0) {
      res.status(404).json({ error: 'Aucun document trouvé' })
      return
    }

    if (format === 'zip') {
      await exportZip(docs, domain_label, res)
    } else {
      await exportMergedPdf(docs, domain_label, res)
    }
  } catch (err) {
    console.error('[export] Erreur:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur lors de la génération de l\'export' })
    }
  }
})

export default router
