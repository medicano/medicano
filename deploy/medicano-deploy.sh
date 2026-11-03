#!/usr/bin/env bash
# medicano-deploy — deploy por pull na própria VM (nada entra vindo do GitHub).
#
#   medicano-deploy staging              segue a main (o timer chama a cada 5 min)
#   medicano-deploy production v1.2.0    publica a tag; também é o rollback
#   medicano-deploy status               o que está no ar
#
# Opções: --skip-ci  publica sem conferir o CI do commit (só em emergência)
#         --force    staging: refaz o deploy mesmo sem commit novo
#
# Instalação e uso: deploy/README.md, seção 6. Depois de mudar este arquivo no
# repositório, reinstale: sudo install -m 755 deploy/medicano-deploy.sh /usr/local/bin/medicano-deploy
set -euo pipefail

REPO="${MEDICANO_REPO:-medicano/medicano}"
STAGING_DIR="${MEDICANO_STAGING_DIR:-/opt/medicano-staging}"
PROD_DIR="${MEDICANO_PROD_DIR:-/opt/medicano}"
KEEP_VERSIONS="${MEDICANO_KEEP_VERSIONS:-5}"
API_IMAGE="${API_IMAGE:-ghcr.io/medicano/medicano-api}"
WEB_IMAGE="${WEB_IMAGE:-ghcr.io/medicano/medicano-web}"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
die() { log "ERRO: $*" >&2; exit 1; }

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
}

# Resultado do CI de um commit (repositório público: sem token).
# 0 = verde, 1 = vermelho, 2 = rodando, sem resultado ou GitHub fora do ar.
ci_status() {
  local json
  json=$(curl -fsS --max-time 20 -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/$REPO/commits/$1/check-runs?per_page=100") || return 2
  jq -e '.total_count > 0' >/dev/null <<<"$json" || return 2
  jq -e 'all(.check_runs[]; .status == "completed")' >/dev/null <<<"$json" || return 2
  jq -e 'all(.check_runs[]; .conclusion == "success" or .conclusion == "skipped" or .conclusion == "neutral")' \
    >/dev/null <<<"$json" || return 1
}

# Grava CHAVE=valor no .env sem sed com o valor (valores podem ter & e /).
set_env() {
  sed -i "/^$1=/d" "$3"
  printf '%s=%s\n' "$1" "$2" >>"$3"
}

# Espera a API ficar healthy e confere API e front por dentro dos containers.
# Roda no diretório deploy/ do ambiente.
smoke_test() {
  local i health=""
  for i in $(seq 1 36); do
    health=$(docker compose ps api --format '{{.Health}}' 2>/dev/null || true)
    [ "$health" = healthy ] && break
    sleep 5
  done
  [ "$health" = healthy ] || { log "a api não ficou healthy em 3 min"; return 1; }
  docker compose exec -T api node -e \
    "fetch('http://127.0.0.1:3000/').then(r=>r.text()).then(t=>process.exit(t.includes('Hello')?0:1)).catch(()=>process.exit(1))" \
    || { log "a api não respondeu"; return 1; }
  docker compose exec -T web wget -qO- http://localhost/ | grep -q '<title>' \
    || { log "o front não respondeu"; return 1; }
}

script_drift_warning() {
  local src="$1/deploy/medicano-deploy.sh"
  if [ -f "$src" ] && ! cmp -s "$src" "$0"; then
    log "aviso: o medicano-deploy.sh do repositório mudou; reinstale (ver o cabeçalho)"
  fi
}

deploy_staging() {
  cd "$STAGING_DIR"
  git fetch -q origin main
  local target current
  target=$(git rev-parse origin/main)
  current=$(git rev-parse HEAD)
  if [ "$target" = "$current" ] && [ "$FORCE" != 1 ]; then
    exit 0
  fi

  if [ "$SKIP_CI" != 1 ]; then
    local rc=0 marker=.git/medicano-last-red
    ci_status "$target" || rc=$?
    if [ "$rc" = 1 ]; then
      # Avisa uma vez por commit vermelho, não a cada 5 minutos.
      if [ "$(cat "$marker" 2>/dev/null)" != "$target" ]; then
        log "CI vermelho em ${target:0:7}: staging continua em ${current:0:7}"
        echo "$target" >"$marker"
      fi
      exit 0
    fi
    [ "$rc" = 0 ] || exit 0 # CI rodando: tenta de novo na próxima vez
  fi

  log "staging: ${current:0:7} → ${target:0:7}"
  git checkout -q --detach "$target"
  cd deploy
  docker compose up -d --build --remove-orphans
  if smoke_test; then
    log "staging ok em ${target:0:7}"
  else
    log "staging com problema em ${target:0:7}: docker compose logs api (em $STAGING_DIR/deploy)"
    exit 1
  fi
  docker image prune -f >/dev/null
  script_drift_warning "$STAGING_DIR"
}

prune_versions() {
  local img old
  for img in "$API_IMAGE" "$WEB_IMAGE"; do
    for old in $(docker image ls "$img" --format '{{.Tag}}' \
      | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | head -n -"$KEEP_VERSIONS"); do
      # Imagem em uso não é removida (o docker recusa sem -f).
      docker image rm "$img:$old" >/dev/null 2>&1 && log "imagem antiga removida: $img:$old"
    done
  done
  docker image prune -f >/dev/null
}

deploy_production() {
  local version=$1
  [[ $version =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "versão no formato vX.Y.Z (ex.: v1.2.0)"
  cd "$PROD_DIR"
  git fetch -q --force --tags origin main

  local sha
  sha=$(git rev-parse -q --verify "refs/tags/$version^{commit}") \
    || die "a tag $version não existe no GitHub (git tag -a $version -m ... && git push origin $version)"
  git merge-base --is-ancestor "$sha" origin/main \
    || die "$version (${sha:0:7}) não está na main"

  if [ "$SKIP_CI" != 1 ]; then
    local rc=0
    ci_status "$sha" || rc=$?
    case $rc in
      0) ;;
      1) die "CI vermelho em ${sha:0:7}; corrija ou use --skip-ci (emergência)" ;;
      *) die "CI de ${sha:0:7} ainda rodando ou sem resultado; tente em alguns minutos" ;;
    esac
  fi

  local prev_tag prev_sha
  prev_tag=$(sed -n 's/^IMAGE_TAG=//p' deploy/.env | tail -1)
  prev_tag=${prev_tag:-latest}
  prev_sha=$(git rev-parse HEAD)
  if [ "$prev_tag" = "$version" ] && [ "$prev_sha" = "$sha" ]; then
    log "produção já está em $version"
    exit 0
  fi
  log "produção: $prev_tag (${prev_sha:0:7}) → $version (${sha:0:7})"

  log "backup do banco antes de trocar a versão"
  "$PROD_DIR/deploy/backup-mongo.sh"

  git checkout -q --detach "$sha"
  cd deploy
  if docker image inspect "$API_IMAGE:$version" "$WEB_IMAGE:$version" >/dev/null 2>&1; then
    log "imagens de $version já existem: sem build (rollback rápido)"
  else
    log "construindo $version (a produção continua no ar durante o build)"
    if ! IMAGE_TAG="$version" docker compose build api web; then
      git -C .. checkout -q --detach "$prev_sha"
      die "build falhou; a produção continua em $prev_tag"
    fi
  fi

  set_env IMAGE_TAG "$version" .env
  docker compose up -d --no-build --remove-orphans

  if smoke_test; then
    log "produção ok em $version"
    prune_versions
    script_drift_warning "$PROD_DIR"
  else
    log "falhou em $version: voltando para $prev_tag"
    set_env IMAGE_TAG "$prev_tag" .env
    git -C .. checkout -q --detach "$prev_sha"
    docker compose up -d --no-build --remove-orphans
    if smoke_test; then
      log "produção voltou para $prev_tag"
    else
      log "ATENÇÃO: o retorno para $prev_tag também falhou; ver docker compose logs api"
    fi
    exit 1
  fi
}

show_status() {
  local d
  for d in "$PROD_DIR" "$STAGING_DIR"; do
    [ -d "$d/.git" ] || continue
    printf '%-24s commit %s  imagem %s\n' "$d" \
      "$(git -C "$d" describe --tags --always 2>/dev/null)" \
      "$(sed -n 's/^IMAGE_TAG=//p' "$d/deploy/.env" 2>/dev/null | tail -1)"
  done
  systemctl list-timers medicano-staging-deploy.timer --no-pager 2>/dev/null | sed -n '1,2p' || true
}

SKIP_CI=0
FORCE=0
args=()
for a in "$@"; do
  case $a in
    --skip-ci) SKIP_CI=1 ;;
    --force) FORCE=1 ;;
    -h | --help) usage; exit 0 ;;
    *) args+=("$a") ;;
  esac
done
set -- "${args[@]+"${args[@]}"}"

command -v jq >/dev/null && command -v curl >/dev/null || die "instale jq e curl: sudo apt install -y jq curl"

case "${1:-}" in
  staging)
    # Um deploy por vez na VM (dois builds juntos apertam a memória).
    exec 9>/tmp/medicano-deploy.lock
    flock -n 9 || exit 0
    deploy_staging
    ;;
  production)
    [ -n "${2:-}" ] || die "uso: medicano-deploy production vX.Y.Z"
    exec 9>/tmp/medicano-deploy.lock
    flock -w 900 9 || die "outro deploy em andamento há mais de 15 min"
    deploy_production "$2"
    ;;
  status) show_status ;;
  *) usage; exit 2 ;;
esac
