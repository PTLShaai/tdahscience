// ecosystem.config.js — PM2 config pour TDAH Science
// Parse le .env manuellement (pas de dépendance externe)

const fs   = require('fs')
const path = require('path')

function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const env = {}
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const idx = trimmed.indexOf('=')
      if (idx === -1) return
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      env[key] = val
    })
    return env
  } catch (e) {
    console.error('[ecosystem] Impossible de lire .env :', e.message)
    return {}
  }
}

const envPath = path.join(__dirname, '.env')
const envVars = parseEnvFile(envPath)

if (!envVars.DATABASE_URL) {
  console.error('[ecosystem] ⚠️  DATABASE_URL absent du .env !')
}

module.exports = {
  apps: [
    {
      name: 'tdahscience-api',
      script: './server/dist/index.js',
      cwd: '/var/www/tdahscience',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      time: true,
      env: {
        NODE_ENV: 'production',
        ...envVars,
      },
      error_file: '/var/log/pm2/tdahscience-error.log',
      out_file:   '/var/log/pm2/tdahscience-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
