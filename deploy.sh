#!/bin/bash
# Deploy auto NDS-Shop (3 repos : admin, site, bot)
set -euo pipefail

REPOS=(
  "admin|/srv/nds-shop/admin|upload-admin"
  "db|/srv/nds-shop/db|db-nds-shop"
  "bot|/srv/nds-shop/NDS-Shop-Bot|nds-shop-bot"
)

DB_NAME="ndsshop"
BACKUP_DIR="/srv/nds-shop/backups"
FAILED=()

# Crée le dossier de backups
mkdir -p "$BACKUP_DIR"

for entry in "${REPOS[@]}"; do
  IFS='|' read -r name dir app <<< "$entry"
  echo "=== $name ($dir) ==="

  if [ ! -d "$dir" ]; then
    echo "❌ Dossier introuvable : $dir"
    FAILED+=("$name")
    continue
  fi

  cd "$dir"
  git fetch origin main 2>&1 | sed 's/^/  /'
  COUNT=$(git rev-list --count HEAD..origin/main)

  if [ "$COUNT" -eq 0 ]; then
    echo "  aucun nouveau commit, rien à faire."
    continue
  fi

  echo "  $COUNT commit(s) récupéré(s), déploiement..."
  OLD_HEAD=$(git rev-parse HEAD)
  git pull origin main 2>&1 | sed 's/^/  /'

  case "$name" in
    admin)
      SCHEMA_DIFF=$(git diff --name-only "$OLD_HEAD"..HEAD -- backend/prisma/schema.prisma || true)
      
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
        echo "❌ npm install ou build backend KO pour $name"
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
      (npm install) || {
        echo "❌ npm install KO pour $name"
        FAILED+=("$name")
        continue
      }
      
      if [ -d prisma ]; then
        (npx prisma generate) || {
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

  # Redémarre PM2 uniquement si l'étape précédente n'a pas échoué
  pm2 restart "$app" || {
    echo "❌ Échec du redémarrage PM2 pour $app"
    FAILED+=("$name")
    continue
  }
  echo "  ✅ $name redémarré avec succès"
done

# Nettoyage des backups de plus de 14 jours
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +14 -delete 2>/dev/null || true

# Rapport final
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "⚠️ Déploiement partiel : les services suivants ont échoué : ${FAILED[*]}"
  exit 1
else
  echo "✅ Déploiement terminé avec succès."
fi