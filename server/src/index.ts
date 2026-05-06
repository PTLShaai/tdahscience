import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { config } from './config'
import authRoutes      from './routes/auth'
import topicsRoutes    from './routes/topics'
import documentsRoutes from './routes/documents'
import domainsRoutes   from './routes/domains'
import jobsRoutes      from './routes/jobs'
import exportRoutes    from './routes/export'

const app = express()

// Créer le dossier uploads si absent
fs.mkdirSync(config.uploadsDir, { recursive: true })

app.use(cors())
app.use(express.json())

app.use('/uploads', express.static(config.uploadsDir))

app.use('/api/auth',      authRoutes)
app.use('/api/topics',    topicsRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/domains',   domainsRoutes)
app.use('/api/jobs',      jobsRoutes)
app.use('/api/export',    exportRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
})

if (process.env.NODE_ENV === 'production') {
  const clientDir = path.join(__dirname, '../../client')
  app.use(express.static(clientDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'))
  })
}

app.listen(config.port, () => {
  console.log(`🚀 TDAH Science API — port ${config.port}`)
  console.log(`   IA primaire  : ${config.aiPrimaryModel}`)
  console.log(`   IA secondaire: ${config.aiSecondaryModel}`)
  console.log(`   Uploads      : ${config.uploadsDir}`)

  import('./worker').then(({ startWorker }) => {
    startWorker().catch(err => console.error('[worker] Erreur démarrage:', err))
  })
})

export default app
