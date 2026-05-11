#!/usr/bin/env bash
# G検定攻略サイト — VPS 更新スクリプト
# git pull → イメージ再ビルド → 起動中サービスを置き換え (DB はそのまま)

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
if ! groups "$USER" 2>/dev/null | grep -q '\bdocker\b'; then
  COMPOSE="sudo $COMPOSE"
fi

echo "[1/3] git pull..."
git pull --ff-only

echo "[2/3] イメージ再ビルド..."
$COMPOSE build backend frontend

echo "[3/3] サービス再起動 (マイグレーション含む)..."
$COMPOSE up -d

$COMPOSE ps
echo "完了。"
