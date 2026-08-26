#!/bin/bash
# Deploy auto NDS-Shop (3 repos : admin, site, bot)
set -euo pipefail

# Définition des couleurs ANSI
C_RESET="\e[0m"
C_BOLD="\e[1m"
C_RED="\e[31m"
C_GREEN="\e[32m"
C_YELLOW="\e[33m"
C_BLUE="\e[34m"
C_CYAN="\e[36m"

# Fonctions d'affichage formaté
log_info()    { echo -e "${C_BLUE}${C_BOLD}[INFO]${C_RESET} $*"; }
log_success() { echo -e "${C_GREEN}${C_BOLD}[OK]${C_RESET} $*"; }
log_warn()    { echo -e "${C_YELLOW}${C_BOLD}[WARN]${C_RESET} $*"; }
log_error()   { echo -e "${C_RED}${C_BOLD}[ERROR]${C_RESET} $*"; }

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
  echo -e "\n${C_CYAN}${C_BOLD}=== $name ($dir) ===${C_RESET}"

  if [ ! -d "$dir" ]; then
    log_error "Dossier introuvable : $dir"
    FAILED+=("$name")
    continue
  fi

  cd "$dir"
  git fetch origin main 2>&1 | sed 's/^/  /'
  COUNT=$(git rev-list --count HEAD..origin/main)

  if [ "$COUNT" -eq 0 ]; then
    log_info "Aucun nouveau commit, rien à faire."
    continue
  fi

  log_info "$COUNT commit(s) récupéré(s), déploiement en cours..."
  OLD_HEAD=$(git rev-parse HEAD)
  git pull origin main 2>&1 | sed 's/^/  /'

  case "$name" in
    admin)
      SCHEMA_DIFF=$(git diff --name-only "$OLD_HEAD"..HEAD -- backend/prisma/schema.prisma || true)
      
      (cd backend && npm install && npx prisma generate) || {
        log_error "npm install ou prisma generate KO pour $name"
        FAILED+=("$name")
        continue
      }
      
      if [ -n "$SCHEMA_DIFF" ]; then
        log_warn "schema.prisma modifié -> backup BDD + db push"
        sudo mysqldump -u root --no-tablespaces "$DB_NAME" > "$BACKUP_DIR/ndsshop_$(date +%Y%m%d_%H%M%S).sql"
        (cd backend && npx prisma db push) || {
          log_error "prisma db push KO pour $name"
          FAILED+=("$name")
          continue
        }
      fi
      
      (cd frontend && npm install && npm run build) || {
        log_error "build frontend KO pour $name"
        FAILED+=("$name")
        continue
      }
      ;;
      
    db)
      (cd backend && npm install && npx prisma generate && npx tsc) || {
        log_error "npm install ou build backend KO pour $name"
        FAILED+=("$name")
        continue
      }
      
      (cd frontend && npm install && npm run build) || {
        log_error "build frontend KO pour $name"
        FAILED+=("$name")
        continue
      }
      ;;
      
    bot)
      (npm install) || {
        log_error "npm install KO pour $name"
        FAILED+=("$name")
        continue
      }
      
      if [ -d prisma ]; then
        (npx prisma generate) || {
          log_error "prisma generate KO pour $name"
          FAILED+=("$name")
          continue
        }
      fi
      
      if [ -d frontend ]; then
        (cd frontend && npm install && npm run build) || {
          log_error "build frontend KO pour $name"
          FAILED+=("$name")
          continue
        }
      fi
      ;;
  esac

  # Redémarre PM2 uniquement si l'étape précédente n'a pas échoué
  pm2 restart "$app" || {
    log_error "Échec du redémarrage PM2 pour $app"
    FAILED+=("$name")
    continue
  }
  log_success "$name redémarré avec succès"
done

# Nettoyage des backups de plus de 14 jours
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +14 -delete 2>/dev/null || true

# Rapport final
echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  log_warn "Déploiement partiel. Services en échec : ${FAILED[*]}"
  exit 1
else
  log_success "Déploiement terminé avec succès."
fi