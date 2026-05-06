import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'
import { Response } from 'express'
import { query } from '../db/connection'

interface ExportDoc {
  id: string
  title: string | null
  file_name: string
  file_path: string
  year: number | null
  study_type: string | null
  n_grade: string | null
  total_n: number | null
  university_flag: boolean
  key_findings_literal: string[]
  limitations_literal: string[]
  authors: string[]
  doi: string | null
}

// Charger les documents sélectionnés avec leurs analyses
export async function loadExportDocs(documentIds: string[]): Promise<ExportDoc[]> {
  const placeholders = documentIds.map((_, i) => `$${i + 1}`).join(',')
  return query<ExportDoc>(
    `SELECT d.id, d.title, d.file_name, d.file_path, d.year, d.study_type,
            d.authors, d.doi,
            da.n_grade, da.total_n, da.university_flag,
            da.key_findings_literal, da.limitations_literal
     FROM documents d
     LEFT JOIN document_analyses da ON d.id = da.document_id
     WHERE d.id IN (${placeholders})
     ORDER BY d.year DESC NULLS LAST`,
    documentIds
  )
}

// Générer le texte de la page de synthèse
function buildSummaryText(docs: ExportDoc[], domainLabel: string): string {
  const now = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
  const grades = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, '?': 0 }
  docs.forEach(d => {
    const g = (d.n_grade as keyof typeof grades) || '?'
    grades[g] = (grades[g] || 0) + 1
  })

  const lines = [
    `SYNTHÈSE DE LITTÉRATURE — ${domainLabel.toUpperCase()}`,
    `Exporté le ${now} depuis TDAH Science`,
    `${docs.length} article(s) sélectionné(s)`,
    '',
    '═══ DISTRIBUTION DES NIVEAUX DE PREUVE ═══',
    `Grade A (1000+) : ${grades.A}  |  Grade B (200-999) : ${grades.B}  |  Grade C (50-199) : ${grades.C}`,
    `Grade D (20-49) : ${grades.D}  |  Grade E (10-19) : ${grades.E}  |  Grade F (<10) : ${grades.F}`,
    '',
    '═══ ARTICLES INCLUS ═══',
    ...docs.map((d, i) => [
      `${i + 1}. ${d.title || d.file_name}`,
      `   Année: ${d.year || '?'} | Grade: ${d.n_grade || '?'} | Type: ${d.study_type?.replace(/_/g, ' ') || '?'}`,
      d.university_flag ? '   ⚠ Recrutement universitaire détecté' : '',
      d.doi ? `   DOI: ${d.doi}` : '',
      '',
    ].filter(Boolean)).flat(),
    '═══ RÉSULTATS CLÉS PAR ARTICLE ═══',
    '',
    ...docs.flatMap(d => {
      if (!d.key_findings_literal?.length) return []
      return [
        `── ${d.title || d.file_name} (${d.year || '?'}) ──`,
        ...(d.key_findings_literal || []).map(f => `  • ${f}`),
        '',
      ]
    }),
  ]

  return lines.join('\n')
}

// Créer la page de couverture PDF
async function createCoverPage(pdfDoc: PDFDocument, summaryText: string): Promise<void> {
  const page = pdfDoc.addPage(PageSizes.A4)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  const margin = 50
  let y = height - margin

  const lines = summaryText.split('\n')
  for (const line of lines) {
    if (y < margin + 20) break
    const isBold = line.startsWith('═') || line.startsWith('SYNTHÈSE')
    const fontSize = isBold ? 11 : 9.5
    const currentFont = isBold ? fontBold : font
    const color = line.startsWith('  •') ? rgb(0.1, 0.1, 0.5) :
                  line.startsWith('⚠') ? rgb(0.7, 0.4, 0) : rgb(0.1, 0.1, 0.1)

    page.drawText(line.slice(0, 90), {
      x: margin,
      y,
      size: fontSize,
      font: currentFont,
      color,
    })
    y -= fontSize + 3
  }
}

// Export PDF fusionné
export async function exportMergedPdf(
  docs: ExportDoc[],
  domainLabel: string,
  res: Response
): Promise<void> {
  const mergedPdf = await PDFDocument.create()

  // Page de synthèse en tête
  const summaryText = buildSummaryText(docs, domainLabel)
  await createCoverPage(mergedPdf, summaryText)

  // Fusionner les PDFs
  let merged = 0
  for (const doc of docs) {
    try {
      if (!fs.existsSync(doc.file_path)) continue
      const pdfBytes = fs.readFileSync(doc.file_path)
      const srcPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
      const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices())
      pages.forEach(p => mergedPdf.addPage(p))
      merged++
    } catch (err) {
      console.error(`[export] Impossible de fusionner ${doc.file_name}:`, err)
    }
  }

  const pdfBytes = await mergedPdf.save()
  const filename = `tdahscience_${domainLabel.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.pdf`

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('X-Merged-Count', String(merged))
  res.send(Buffer.from(pdfBytes))
}

// Export ZIP (fallback ou option)
export async function exportZip(
  docs: ExportDoc[],
  domainLabel: string,
  res: Response
): Promise<void> {
  const filename = `tdahscience_${domainLabel.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.zip`
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

  const archive = archiver('zip', { zlib: { level: 6 } })
  archive.pipe(res)

  // Synthèse en markdown
  const summaryText = buildSummaryText(docs, domainLabel)
  archive.append(summaryText, { name: '00_SYNTHESE.md' })

  // PDFs individuels
  for (const doc of docs) {
    try {
      if (!fs.existsSync(doc.file_path)) continue
      archive.file(doc.file_path, { name: doc.file_name })
    } catch { /* skip */ }
  }

  await archive.finalize()
}
