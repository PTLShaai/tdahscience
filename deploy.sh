#!/bin/bash
# deploy.sh — TDAH Science
# Usage: sudo bash deploy.sh
# Depuis /var/www/tdahscience

set -e

DEPLOY_DIR="/var/www/tdahscience"
CLIENT_DIR="$DEPLOY_DIR/client"
SERVER_DIR="$DEPLOY_DIR/server"
PM2_NAME="tdahscience-api"
PORT=3020

echo "======================================"
echo "  Déploiement TDAH Science"
echo "======================================"

# 1. Pull
echo ""
echo "📥 [1/6] Git pull..."
cd "$DEPLOY_DIR"
git pull origin main

# 2. Build frontend
echo ""
echo "🔨 [2/6] Build frontend..."
cd "$DEPLOY_DIR"
npm install --ignore-scripts
npm run build

# 3. Copier dist → client
echo ""
echo "📂 [3/6] Mise à jour client/..."
mkdir -p "$CLIENT_DIR"
rm -rf "$CLIENT_DIR"/*
cp -r "$DEPLOY_DIR/dist/"* "$CLIENT_DIR/"

# 4. Build backend
echo ""
echo "🔨 [4/6] Build backend..."
cd "$SERVER_DIR"
npm install
npm run build

# 5. Migrations BDD
echo ""
echo "🗄️  [5/6] Migrations base de données..."
cd "$SERVER_DIR"
set -a; source "$DEPLOY_DIR/.env"; set +a
node dist/db/migrate.js
echo "  → Migrations OK"

# 6. Redémarrer PM2 via ecosystem.config.cjs
# (charge le .env automatiquement depuis la racine du projet)
echo ""
echo "🔄 [6/6] Redémarrage PM2 (port $PORT)..."
mkdir -p /var/log/pm2

if pm2 describe "$PM2_NAME" > /dev/null 2>&1; then
  echo "  → Arrêt du process..."
  pm2 stop "$PM2_NAME"
  sleep 2
fi

pm2 delete "$PM2_NAME" > /dev/null 2>&1 || true
pm2 start "$DEPLOY_DIR/ecosystem.config.cjs" --update-env
pm2 save
pm2 list

echo ""
echo "======================================"
echo "  ✅ Déploiement terminé"
echo "  🌐 https://tdahscience.pierrefv.com"
echo "  🔌 Port : $PORT"
echo "======================================"
