import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config'

const client = new Anthropic({ apiKey: config.aiPrimaryKey })

export interface ExtractionResult {
  // Identification
  doi: string | null
  title: string | null
  authors: string[]
  year: number | null
  journal: string | null

  // Type d'étude
  study_type: string | null
  has_participants: boolean

  // Population
  total_n: number | null
  analysis_n: number | null
  n_grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | null
  age_min: number | null
  age_max: number | null
  age_range_literal: string | null
  diagnosis_context_literal: string | null
  recruitment_type: string | null
  university_flag: boolean
  multi_site: boolean | null
  geographic_context: string | null
  control_group: boolean | null
  sex_breakdown_literal: string | null

  // Qualité de preuve
  structured_diagnostic_tool: boolean | null
  diagnostic_tool_name: string | null
  multiple_informants: boolean | null
  randomized: boolean | null
  longitudinal: boolean | null

  // Résultats
  research_domains: string[]
  medications_studied: string[]
  key_findings_literal: string[]
  limitations_literal: string[]

  // Méta
  uncertain_fields: string[]
  extraction_confidence: 'high' | 'medium' | 'low'

  // Citations verbatim (pour la validation)
  _citations: Record<string, string>
}

const EXTRACTION_PROMPT = `Tu es un extracteur de données scientifiques. Tu analyses un article de recherche et tu extrais des informations structurées.

RÈGLES ABSOLUES :
1. Tu ne dois JAMAIS inventer ou inférer une information qui n'est pas explicitement dans le texte
2. Si une information est absente → retourne null pour ce champ
3. Pour chaque champ extrait (non-null), tu DOIS fournir une citation verbatim dans _citations
4. Les citations doivent être des extraits exacts du texte, pas des paraphrases
5. Si tu n'es pas certain d'une valeur, ajoute le nom du champ dans uncertain_fields

GRILLE DE POPULATION (n_grade) :
- F : moins de 10 participants
- E : 10 à 19 participants  
- D : 20 à 49 participants
- C : 50 à 199 participants
- B : 200 à 999 participants
- A : 1000 participants et plus
- null si l'article n'a pas de participants (ex: revue théorique)

UNIVERSITY_FLAG : true si le recrutement mentionne explicitement des étudiants universitaires, des "undergraduate students", une université spécifique comme source de participants.

STUDY_TYPE : choisir parmi : theoretical_model, systematic_review, meta_analysis, RCT, cohort, case_control, cross_sectional, epidemiological, case_study, qualitative, review_narrative

RESEARCH_DOMAINS : liste ouverte, extraire tous les domaines/thèmes de recherche mentionnés (ex: "working memory", "behavioral inhibition", "executive functions", "sleep", "medication", "comorbidity", etc.)

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après.

Format attendu :
{
  "doi": "10.xxxx/..." ou null,
  "title": "...",
  "authors": ["Nom, P.", ...],
  "year": 1997,
  "journal": "...",
  "study_type": "...",
  "has_participants": false,
  "total_n": null,
  "analysis_n": null,
  "n_grade": null,
  "age_min": null,
  "age_max": null,
  "age_range_literal": null,
  "diagnosis_context_literal": null,
  "recruitment_type": null,
  "university_flag": false,
  "multi_site": null,
  "geographic_context": null,
  "control_group": null,
  "sex_breakdown_literal": null,
  "structured_diagnostic_tool": null,
  "diagnostic_tool_name": null,
  "multiple_informants": null,
  "randomized": null,
  "longitudinal": null,
  "research_domains": [],
  "medications_studied": [],
  "key_findings_literal": [],
  "limitations_literal": [],
  "uncertain_fields": [],
  "extraction_confidence": "high",
  "_citations": {
    "title": "citation verbatim...",
    "year": "citation verbatim..."
  }
}`

export async function extractWithClaude(text: string): Promise<ExtractionResult> {
  const message = await client.messages.create({
    model: config.aiPrimaryModel,
    max_tokens: 6000,
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\n---\nTEXTE DE L'ARTICLE :\n${text}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Réponse Claude inattendue')
  }

  // Nettoyer la réponse (enlever éventuels backticks)
  let cleaned = content.text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Si le JSON est tronqué, tenter de le fermer proprement
  if (!cleaned.endsWith('}')) {
    // Trouver la dernière propriété complète et fermer le JSON
    const lastComma = cleaned.lastIndexOf(',')
    const lastBrace = cleaned.lastIndexOf('}')
    if (lastComma > lastBrace) {
      cleaned = cleaned.slice(0, lastComma) + '}'
    } else {
      cleaned = cleaned + '}'
    }
    // S'assurer que les tableaux ouverts sont fermés
    const openBrackets = (cleaned.match(/\[/g) || []).length
    const closeBrackets = (cleaned.match(/\]/g) || []).length
    if (openBrackets > closeBrackets) {
      cleaned = cleaned.slice(0, cleaned.lastIndexOf('[')) + '[]}'
    }
  }

  return JSON.parse(cleaned) as ExtractionResult
}
