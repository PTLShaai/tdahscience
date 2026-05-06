import fs from 'fs'
import pdfParse from 'pdf-parse'

export interface PdfContent {
  text: string
  pages: number
  info: Record<string, unknown>
}

export async function extractPdfText(filePath: string): Promise<PdfContent> {
  const buffer = fs.readFileSync(filePath)
  const data = await pdfParse(buffer)
  return {
    text: data.text,
    pages: data.numpages,
    info: data.info as Record<string, unknown>,
  }
}

// Nettoyer et tronquer le texte pour l'IA (éviter les tokens excessifs)
export function prepareTextForAI(text: string, maxChars = 80000): string {
  return text
    .replace(/\s+/g, ' ')         // normaliser les espaces
    .replace(/\f/g, '\n\n')       // form feeds → paragraphes
    .trim()
    .slice(0, maxChars)
}
