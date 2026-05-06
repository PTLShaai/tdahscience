import fs from 'fs'
import path from 'path'
import { pool } from './connection'
import 'dotenv/config'

async function migrate() {
  console.log('🗄️  Exécution des migrations...')

  // Table de suivi des migrations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT name FROM _migrations WHERE name = $1',
      [file]
    )
    if (rows.length > 0) {
      console.log(`  ✓ ${file} (déjà appliquée)`)
      continue
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    await pool.query(sql)
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
    console.log(`  ✅ ${file} appliquée`)
  }

  console.log('✅ Migrations terminées')
  await pool.end()
}

migrate().catch(err => {
  console.error('❌ Migration échouée:', err)
  process.exit(1)
})
