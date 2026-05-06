import express from 'express'
import cors from 'cors'
import path from 'path'
import { config } from './config'
import authRoutes     from './routes/auth'
import topicsRoutes   from './routes/topics'
import documentsRoutes from './routes/documents'
import domainsRoutes  from './routes/domains'
import jobsRoutes     from './routes/jobs'

const app = express()

app.use(cors())
app.use(express.json())

// Servir les PDFs uploadés (accès restreint par auth dans le futur)
app.use('/uploads', express.static(config.uploadsDir))

// Routes API
app.use('/api/auth',      authRoutes)
app.use('/api/topics',    topicsRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/domains',   domainsRoutes)
app.use('/api/jobs',      jobsRoutes)

// Santé
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
})

// Frontend (en production, Nginx sert les fichiers statiques)
// En dev, Vite proxy gère ça
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
})

export default app
