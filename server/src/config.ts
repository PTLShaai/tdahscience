import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Variable d'environnement manquante : ${key}`)
  return val
}

export const config = {
  port: parseInt(process.env.PORT || '3020', 10),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  uploadsDir: process.env.UPLOADS_DIR || './uploads',

  // IA primaire
  aiPrimaryProvider: process.env.AI_PRIMARY_PROVIDER || 'anthropic',
  aiPrimaryModel:    process.env.AI_PRIMARY_MODEL    || 'claude-sonnet-4-20250514',
  aiPrimaryKey:      required('AI_PRIMARY_KEY'),

  // IA secondaire (validation)
  aiSecondaryProvider: process.env.AI_SECONDARY_PROVIDER || 'infomaniak',
  aiSecondaryModel:    process.env.AI_SECONDARY_MODEL    || 'llama-3.3-70b',
  aiSecondaryBaseUrl:  process.env.AI_SECONDARY_BASE_URL || '',
  aiSecondaryKey:      process.env.AI_SECONDARY_KEY      || '',
}
