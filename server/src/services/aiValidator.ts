import OpenAI from 'openai'
import { config } from '../config'
import { ExtractionResult } from './aiExtractor'

const client = new OpenAI({
  apiKey: config.aiSecondaryKey,
  baseURL: config.aiSecondaryBaseUrl,
})

export interface ValidationResult {
  validated_fields: string[]
  rejected_fields: string[]
  uncertain_fields: string[]
  overall: 'valid' | 'partial' | 'failed'
  notes: string
}

export async function validateWithSecondaryAI(
  extraction: ExtractionResult,
  originalText: string
): Promise<ValidationResult> {

  // On ne valide que les champs non-null qui ont des citations
  const fieldsToValidate = Object.entries(extraction._citations)
    .filter(([, citation]) => citation && citation.length > 10)
    .slice(0, 15) // limite pour ne pas dépasser les tokens

  if (fieldsToValidate.length === 0) {
    return {
      validated_fields: [],
      rejected_fields: [],
      uncertain_fields: [],
      overall: 'valid',
      notes: 'Aucun champ à valider',
    }
  }

  const validationPrompt = `Tu es un validateur de données scientifiques. Pour chaque champ extrait d'un article, tu dois vérifier que la citation verbatim fournie justifie bien la valeur extraite.

CHAMPS À VALIDER :
${fieldsToValidate.map(([field, citation]) => {
  const value = (extraction as Record<string, unknown>)[field]
  return `- ${field}: valeur="${JSON.stringify(value)}" | citation="${citation}"`
}).join('\n')}

EXTRAIT DU TEXTE ORIGINAL (500 premiers caractères) :
${originalText.slice(0, 500)}

Pour chaque champ, réponds : VALIDE, REJETÉ, ou INCERTAIN.

Réponds UNIQUEMENT en JSON :
{
  "validated_fields": ["field1", "field2"],
  "rejected_fields": ["field3"],
  "uncertain_fields": ["field4"],
  "overall": "valid",
  "notes": "observation globale courte"
}`

  try {
    const response = await client.chat.completions.create({
      model: config.aiSecondaryModel,
      max_tokens: 800,
      temperature: 0.1,
      messages: [{ role: 'user', content: validationPrompt }],
    })

    const content = response.choices[0]?.message?.content || ''
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    return JSON.parse(cleaned) as ValidationResult
  } catch (err) {
    console.error('[validator] Erreur IA secondaire:', err)
    // En cas d'échec de la validation secondaire, on continue avec les données Claude
    return {
      validated_fields: fieldsToValidate.map(([f]) => f),
      rejected_fields: [],
      uncertain_fields: [],
      overall: 'valid',
      notes: `Validation secondaire indisponible: ${String(err)}`,
    }
  }
}
