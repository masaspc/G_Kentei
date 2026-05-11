#!/usr/bin/env bash
# G検定攻略サイト — PostgreSQL バックアップ
# 使い方: bash scripts/backup.sh [出力ディレクトリ]
# 例:     bash scripts/backup.sh ~/backups

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

OUT_DIR=${1:-./backups}
mkdir -p "$OUT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
if [[ "$EUID" -ne 0 ]] && ! groups "$USER" 2>/dev/null | grep -q '\bdocker\b'; then
  COMPOSE="sudo $COMPOSE"
fi

STAMP=$(date +%Y%m%d_%H%M%S)
OUT_FILE="$OUT_DIR/g_kentei_${STAMP}.sql.gz"

$COMPOSE exec -T postgres pg_dump -U g_kentei g_kentei | gzip > "$OUT_FILE"
echo "バックアップ完了: $OUT_FILE"
ls -lh "$OUT_FILE"
