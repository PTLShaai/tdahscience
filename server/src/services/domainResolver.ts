import { query } from '../db/connection'

// Résoudre un label brut vers un domain_id connu (via alias)
async function resolveAlias(rawLabel: string): Promise<string | null> {
  const rows = await query<{ domain_id: string }>(
    'SELECT domain_id FROM domain_aliases WHERE LOWER(raw_label) = LOWER($1)',
    [rawLabel]
  )
  return rows.length > 0 ? rows[0].domain_id : null
}

// Créer un nouveau domaine normalisé
async function createDomain(label: string): Promise<string> {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 150)

  // Upsert — si le slug existe déjà, retourne son id
  const rows = await query<{ id: string }>(
    `INSERT INTO research_domains (slug, label)
     VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
     RETURNING id`,
    [slug, label]
  )
  return rows[0].id
}

// Lier un document à ses domaines
export async function resolveAndLinkDomains(
  documentId: string,
  rawDomains: string[]
): Promise<void> {
  for (const rawLabel of rawDomains) {
    if (!rawLabel || rawLabel.trim().length === 0) continue

    const trimmed = rawLabel.trim()
    let domainId = await resolveAlias(trimmed)

    if (!domainId) {
      // Nouveau domaine — créer automatiquement
      domainId = await createDomain(trimmed)
      // Enregistrer l'alias pour les prochains docs
      await query(
        `INSERT INTO domain_aliases (raw_label, domain_id)
         VALUES ($1, $2)
         ON CONFLICT (raw_label) DO NOTHING`,
        [trimmed, domainId]
      )
    }

    // Lier document ↔ domaine
    await query(
      `INSERT INTO document_domains (document_id, domain_id, raw_label)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id, domain_id) DO NOTHING`,
      [documentId, domainId, trimmed]
    )
  }
}
