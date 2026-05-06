# TDAH Science — Veille scientifique

Application de veille scientifique personnelle sur le TDAH (et autres sujets neuro).

## Stack

- **Frontend** : React 19 + Vite 7 + TypeScript
- **Backend** : Node.js + Express + TypeScript
- **Base de données** : PostgreSQL
- **IA primaire** : Claude (Anthropic)
- **IA secondaire** : Infomaniak AI (configurable)
- **Process manager** : PM2 (port 3020)

## Installation (VPS)

```bash
# 1. Cloner le repo
cd /var/www
git clone https://github.com/PTLShaai/tdahscience.git
cd tdahscience

# 2. Créer le fichier .env
cp .env.example .env
nano .env   # remplir les variables

# 3. Créer la base de données PostgreSQL
createdb tdahscience

# 4. Déployer
bash deploy.sh
```

## Développement local

```bash
# Terminal 1 — Backend
cd server && npm install && npm run dev

# Terminal 2 — Frontend
npm install && npm run dev
```

## Structure

```
tdahscience/
├── src/              # Frontend React
├── server/
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # IA, extraction, queue
│   │   └── db/       # Connexion + migrations
│   └── dist/         # Build (gitignored)
├── client/           # Frontend buildé (gitignored)
├── .env.example
└── deploy.sh
```

## API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Se connecter |
| GET | `/api/topics` | Sujets disponibles |
| POST | `/api/documents/upload` | Uploader des PDFs |
| GET | `/api/documents` | Lister les documents |
| GET | `/api/domains` | Domaines de recherche |
| GET | `/api/domains/trends` | Tendances par année |
| GET | `/api/jobs/stats` | État de la queue |
