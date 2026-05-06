#!/bin/bash
# setup_db.sh — Initialisation PostgreSQL pour TDAH Science
# Usage: sudo -u postgres bash setup_db.sh
# À exécuter UNE SEULE FOIS sur le VPS, avant le premier deploy.sh

set -e

DB_NAME="tdahscience"
DB_USER="tdahscience_user"

echo "======================================"
echo "  Initialisation PostgreSQL"
echo "  Base   : $DB_NAME"
echo "  User   : $DB_USER"
echo "======================================"

# Générer un mot de passe aléatoire sécurisé
DB_PASS=$(openssl rand -base64 24)

echo ""
echo "📦 Création de l'utilisateur..."
psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
  echo "  → Utilisateur déjà existant, on continue"

echo ""
echo "🗄️  Création de la base de données..."
psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || \
  echo "  → Base déjà existante, on continue"

echo ""
echo "🔒 Attribution des droits..."
psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"

echo ""
echo "======================================"
echo "  ✅ Base de données prête"
echo ""
echo "  Ajoute cette ligne dans ton .env :"
echo ""
echo "  DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
echo ""
echo "  ⚠️  Note bien ce mot de passe, il ne sera plus affiché."
echo "======================================"
