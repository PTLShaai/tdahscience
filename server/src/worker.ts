import { query } from './db/connection'
import { extractPdfText, prepareTextForAI } from './services/pdfExtractor'
import { extractWithClaude } from './services/aiExtractor'
import { validateWithSecondaryAI } from './services/aiValidator'
import { resolveAndLinkDomains } from './services/domainResolver'

interface ImportJob {
  id: string
  document_id: string
  topic_id: string | null
  file_path: string
  file_name: string
}

// Calculer le grade de population
function computeNGrade(n: number | null): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | null {
  if (n === null) return null
  if (n >= 1000) return 'A'
  if (n >= 200)  return 'B'
  if (n >= 50)   return 'C'
  if (n >= 20)   return 'D'
  if (n >= 10)   return 'E'
  return 'F'
}

async function processJob(job: ImportJob): Promise<void> {
  console.log(`[worker] Traitement: ${job.file_name} (job ${job.id})`)

  // 1. Marquer comme en cours
  await query(
    `UPDATE import_jobs SET status = 'processing', started_at = NOW(), attempt_count = attempt_count + 1
     WHERE id = $1`,
    [job.id]
  )

  // 2. Extraire le texte du PDF
  console.log(`[worker] Extraction PDF...`)
  const pdf = await extractPdfText(job.file_path)
  const text = prepareTextForAI(pdf.text)

  if (text.length < 100) {
    throw new Error('PDF illisible ou trop court — vérifier le fichier')
  }

  // 3. Extraction structurée par Claude (passe 1)
  console.log(`[worker] Extraction Claude (${config.aiPrimaryModel})...`)
  const extraction = await extractWithClaude(text)

  // 4. Validation par IA secondaire (passe 2)
  console.log(`[worker] Validation ${config.aiSecondaryModel}...`)
  const validation = await validateWithSecondaryAI(extraction, text)

  // 5. Fusionner les champs incertains (extraction + validation)
  const allUncertain = [
    ...new Set([
      ...extraction.uncertain_fields,
      ...validation.rejected_fields,
      ...validation.uncertain_fields,
    ]),
  ]

  // 6. Déterminer le statut de validation global
  const validationStatus =
    validation.overall === 'failed' ? 'uncertain' :
    allUncertain.length > 3       ? 'uncertain' : 'validated'

  // 7. N grade — utiliser celui de Claude ou recalculer
  const nGrade = extraction.n_grade || computeNGrade(extraction.total_n || extraction.analysis_n)

  // 8. Mettre à jour le document avec les métadonnées extraites
  await query(
    `UPDATE documents SET
       title   = COALESCE($2, title),
       authors = COALESCE($3::jsonb, authors),
       year    = COALESCE($4, year),
       journal = COALESCE($5, journal),
       study_type       = COALESCE($6, study_type),
       has_participants = $7
     WHERE id = $1`,
    [
      job.document_id,
      extraction.title,
      extraction.authors.length > 0 ? JSON.stringify(extraction.authors) : null,
      extraction.year,
      extraction.journal,
      extraction.study_type,
      extraction.has_participants,
    ]
  )

  // 9. Sauvegarder l'analyse complète
  await query(
    `INSERT INTO document_analyses (
       document_id,
       total_n, analysis_n, n_grade,
       age_min, age_max, age_range_literal,
       diagnosis_context_literal, recruitment_type,
       university_flag, multi_site, geographic_context,
       control_group, sex_breakdown_literal,
       structured_diagnostic_tool, diagnostic_tool_name,
       multiple_informants, randomized, longitudinal,
       medications_studied, key_findings_literal, limitations_literal,
       uncertain_fields, extraction_confidence,
       primary_model, secondary_model, validation_status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
       $13, $14, $15, $16, $17, $18, $19,
       $20::jsonb, $21::jsonb, $22::jsonb,
       $23::jsonb, $24, $25, $26, $27
     )
     ON CONFLICT (document_id) DO UPDATE SET
       total_n = EXCLUDED.total_n,
       analysis_n = EXCLUDED.analysis_n,
       n_grade = EXCLUDED.n_grade,
       age_min = EXCLUDED.age_min,
       age_max = EXCLUDED.age_max,
       age_range_literal = EXCLUDED.age_range_literal,
       diagnosis_context_literal = EXCLUDED.diagnosis_context_literal,
       recruitment_type = EXCLUDED.recruitment_type,
       university_flag = EXCLUDED.university_flag,
       multi_site = EXCLUDED.multi_site,
       geographic_context = EXCLUDED.geographic_context,
       control_group = EXCLUDED.control_group,
       sex_breakdown_literal = EXCLUDED.sex_breakdown_literal,
       structured_diagnostic_tool = EXCLUDED.structured_diagnostic_tool,
       diagnostic_tool_name = EXCLUDED.diagnostic_tool_name,
       multiple_informants = EXCLUDED.multiple_informants,
       randomized = EXCLUDED.randomized,
       longitudinal = EXCLUDED.longitudinal,
       medications_studied = EXCLUDED.medications_studied,
       key_findings_literal = EXCLUDED.key_findings_literal,
       limitations_literal = EXCLUDED.limitations_literal,
       uncertain_fields = EXCLUDED.uncertain_fields,
       extraction_confidence = EXCLUDED.extraction_confidence,
       primary_model = EXCLUDED.primary_model,
       secondary_model = EXCLUDED.secondary_model,
       validation_status = EXCLUDED.validation_status,
       updated_at = NOW()`,
    [
      job.document_id,
      extraction.total_n,
      extraction.analysis_n,
      nGrade,
      extraction.age_min,
      extraction.age_max,
      extraction.age_range_literal,
      extraction.diagnosis_context_literal,
      extraction.recruitment_type,
      extraction.university_flag,
      extraction.multi_site,
      extraction.geographic_context,
      extraction.control_group,
      extraction.sex_breakdown_literal,
      extraction.structured_diagnostic_tool,
      extraction.diagnostic_tool_name,
      extraction.multiple_informants,
      extraction.randomized,
      extraction.longitudinal,
      JSON.stringify(extraction.medications_studied),
      JSON.stringify(extraction.key_findings_literal),
      JSON.stringify(extraction.limitations_literal),
      JSON.stringify(allUncertain),
      extraction.extraction_confidence,
      config.aiPrimaryModel,
      config.aiSecondaryModel,
      validationStatus,
    ]
  )

  // 10. Résoudre et lier les domaines
  if (extraction.research_domains.length > 0) {
    await resolveAndLinkDomains(job.document_id, extraction.research_domains)
  }

  // 11. Marquer le job comme terminé
  await query(
    `UPDATE import_jobs SET status = 'done', completed_at = NOW() WHERE id = $1`,
    [job.id]
  )

  console.log(`[worker] ✅ ${job.file_name} — ${validationStatus} — domaines: ${extraction.research_domains.join(', ')}`)
}

// Boucle principale du worker
let isRunning = false

export async function startWorker(): Promise<void> {
  console.log('[worker] 🔄 Worker d\'extraction démarré')

  const tick = async () => {
    if (isRunning) return
    isRunning = true

    try {
      // Récupérer le prochain job pending
      const jobs = await query<ImportJob>(
        `SELECT ij.id, ij.document_id, ij.topic_id,
                d.file_path, d.file_name
         FROM import_jobs ij
         JOIN documents d ON ij.document_id = d.id
         WHERE ij.status = 'pending'
           AND ij.attempt_count < 3
         ORDER BY ij.created_at ASC
         LIMIT 1`
      )

      if (jobs.length > 0) {
        const job = jobs[0]
        try {
          await processJob(job)
        } catch (err) {
          console.error(`[worker] ❌ Erreur job ${job.id}:`, err)
          await query(
            `UPDATE import_jobs
             SET status = CASE WHEN attempt_count >= 3 THEN 'error' ELSE 'pending' END,
                 error_message = $2
             WHERE id = $1`,
            [job.id, String(err)]
          )
        }
      }
    } finally {
      isRunning = false
    }
  }

  // Vérifier toutes les 5 secondes
  setInterval(tick, 5000)
  // Lancer immédiatement aussi
  tick()
}

// Import config ici pour éviter les dépendances circulaires
import { config } from './config'
