#!/bin/bash
# Deploy auto NDS-Shop (3 repos : admin, site, bot)
# - Si git pull récupère >= 1 commit → npm install + Prisma generate + build + redémarre.
# - Backup BDD avant toute migration Prisma (admin seulement).
# - Vérifie les builds avant redémarrage.
set -euo pipefail

REPOS=(
  "admin|/srv/nds-shop/admin|upload-admin"
  "db|/srv/nds-shop/db|db-nds-shop"
  "bot|/srv/nds-shop/NDS-Shop-Bot|nds-shop-bot"
)

DB_NAME=ndsshop
BACKUP_DIR=/srv/nds-shop/backups
FAILED=()

# Crée le dossier de backups
mkdir -p "$BACKUP_DIR"

for entry in "${REPOS[@]}"; do
  IFS='|' read -r name dir app <<< "$entry"
  echo "=== $name ($dir) ==="

  cd "$dir"
  git fetch origin main 2>&1 | sed 's/^/  /'
  COUNT=$(git rev-list --count HEAD..origin/main)

  if [ "$COUNT" -eq 0 ]; then
    echo "  aucun nouveau commit, rien à faire."
    continue
  fi

  echo "  $COUNT commit(s) récupéré(s), déploiement..."
  git pull origin main 2>&1 | sed 's/^/  /'

  case "$name" in
    admin)
      # Détecte si schema.prisma a changé (pour backup + db push)
      SCHEMA_DIFF=$(git diff --name-only HEAD@{1}..HEAD -- backend/prisma/schema.prisma || true)
      
      (cd backend && npm install && npx prisma generate) || {
        echo "❌ npm install ou prisma generate KO pour $name"
        FAILED+=("$name")
        continue
      }
      
      if [ -n "$SCHEMA_DIFF" ]; then
        echo "  schema.prisma modifié → backup BDD + db push"
        sudo mysqldump -u root --no-tablespaces "$DB_NAME" > "$BACKUP_DIR/ndsshop_$(date +%Y%m%d_%H%M%S).sql"
        (cd backend && npx prisma db push) || {
          echo "❌ prisma db push KO pour $name"
          FAILED+=("$name")
          continue
        }
      fi
      
      (cd frontend && npm install && npm run build) || {
        echo "❌ build frontend KO pour $name"
        FAILED+=("$name")
        continue
      }
      ;;
      
    db)
      (cd backend && npm install && npx prisma generate && npx tsc) || {
        echo "❌ npm install ou build KO pour $name"
        FAILED+=("$name")
        continue
      }
      
      (cd frontend && npm install && npm run build) || {
        echo "❌ build frontend KO pour $name"
        FAILED+=("$name")
        continue
      }
      ;;
      
    bot)
      npm install || {
        echo "❌ npm install KO pour $name"
        FAILED+=("$name")
        continue
      }
      
      if [ -d prisma ]; then
        npx prisma generate || {
          echo "❌ prisma generate KO pour $name"
          FAILED+=("$name")
          continue
        }
      fi
      
      if [ -d frontend ]; then
        (cd frontend && npm install && npm run build) || {
          echo "❌ build frontend KO pour $name"
          FAILED+=("$name")
          continue
        }
      fi
      ;;
  esac

  # Redémarre uniquement si tout a réussi
  pm2 restart "$app"
  echo "  ✅ $name redémarré"
done

# Rapport final
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "⚠️  Déploiement partiel : les services suivants ont échoué : ${FAILED[*]}"
  exit 1
else
  echo "✅ Déploiement terminé avec succès."
fi