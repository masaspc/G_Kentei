#!/usr/bin/env bash
# G検定攻略サイト — ConoHa VPS 一発セットアップスクリプト
#
# 対象: Ubuntu 22.04 / 24.04 (ConoHa VPS の標準イメージ)
# 必要: sudo 権限のあるユーザーで実行
#
# 実行例:
#   git clone https://github.com/masaspc/G_Kentei.git
#   cd G_Kentei
#   bash scripts/setup-vps.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------- 1. 前提チェック ----------
if [[ "$EUID" -eq 0 ]]; then
  error "root では実行しないでください。一般ユーザー (sudo 権限あり) で実行してください。"
  exit 1
fi
if ! sudo -n true 2>/dev/null; then
  info "sudo パスワードを要求します。"
  sudo -v
fi

# ---------- 2. apt 更新 + 必要パッケージ ----------
info "apt パッケージを更新中..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg ufw openssl

# ---------- 3. Docker インストール ----------
if ! command -v docker >/dev/null 2>&1; then
  info "Docker をインストール中..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $CODENAME stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  sudo usermod -aG docker "$USER"
  warn "現在のユーザーを docker グループに追加しました。"
  warn "このスクリプト終了後、再ログインまたは 'newgrp docker' を実行してください。"
else
  info "Docker は既にインストールされています。"
fi

# ---------- 4. ファイアウォール (UFW) ----------
info "UFW を設定中 (22/tcp, 80/tcp, 443/tcp を開放)..."
sudo ufw --force reset >/dev/null
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# ---------- 5. .env 生成 ----------
ENV_FILE="$REPO_ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
  warn ".env は既に存在します。バックアップして再生成します。"
  cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"
fi

echo
info "セットアップに必要な情報を入力してください。"
echo

read -rp "公開ドメイン (例: g-kentei.example.com) : " DOMAIN
if [[ -z "$DOMAIN" ]]; then
  error "ドメインは必須です。"
  exit 1
fi

read -rp "管理ユーザー名 [admin] : " AUTH_USERNAME
AUTH_USERNAME=${AUTH_USERNAME:-admin}

while true; do
  read -rsp "管理パスワード (入力は表示されません) : " PWD1; echo
  read -rsp "管理パスワード (確認)                  : " PWD2; echo
  if [[ "$PWD1" == "$PWD2" && -n "$PWD1" ]]; then
    PASSWORD="$PWD1"
    break
  fi
  warn "パスワードが一致しないか空です。再入力してください。"
done

read -rsp "Anthropic API キー (sk-ant-...) : " ANTHROPIC_API_KEY; echo
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
  warn "Anthropic API キーが未設定のため Claude 機能 (解説生成・チャット等) は使えません。"
fi

read -rp "Claude API 月額予算 USD [10.0] : " MONTHLY_API_BUDGET_USD
MONTHLY_API_BUDGET_USD=${MONTHLY_API_BUDGET_USD:-10.0}

read -rp "Discord Webhook URL (任意、未使用なら空Enter) : " DISCORD_WEBHOOK_URL

info "シークレットを自動生成中..."
JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
NOTIFICATION_WEBHOOK_SECRET=$(openssl rand -hex 24)

# bcrypt ハッシュ生成 — 一時 Python コンテナを使用 (パスワードは stdin 経由でプロセス一覧に出さない)
info "管理パスワードを bcrypt でハッシュ化中..."
AUTH_PASSWORD_HASH=$(printf '%s' "$PASSWORD" | \
  docker run --rm -i python:3.12-slim sh -c \
  "pip install -q bcrypt && python -c 'import bcrypt, sys; pw=sys.stdin.buffer.read().strip(); print(bcrypt.hashpw(pw, bcrypt.gensalt()).decode())'")
unset PASSWORD PWD1 PWD2

# ---------- 6. .env 書き出し ----------
cat > "$ENV_FILE" <<EOF
# ===== 自動生成 by scripts/setup-vps.sh ($(date)) =====

# 公開ドメイン (Caddy が自動でLet's Encrypt証明書を取得)
DOMAIN=$DOMAIN

# PostgreSQL
POSTGRES_USER=g_kentei
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=g_kentei

# Backend 接続
DATABASE_URL=postgresql+asyncpg://g_kentei:$POSTGRES_PASSWORD@postgres:5432/g_kentei
REDIS_URL=redis://redis:6379/0
JWT_SECRET=$JWT_SECRET

# 認証 (シングルユーザー)
AUTH_USERNAME=$AUTH_USERNAME
AUTH_PASSWORD_HASH=$AUTH_PASSWORD_HASH

# Anthropic Claude API
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
MONTHLY_API_BUDGET_USD=$MONTHLY_API_BUDGET_USD

# 通知 (F-15)
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL
NOTIFICATION_WEBHOOK_SECRET=$NOTIFICATION_WEBHOOK_SECRET

# Frontend ビルド (同一ドメイン経由なので空文字でOK)
NEXT_PUBLIC_API_BASE_URL=
EOF
chmod 600 "$ENV_FILE"
info ".env を $ENV_FILE に書き出しました (パーミッション 600)。"

# ---------- 7. Docker Compose 起動 ----------
info "Docker イメージをビルドして起動します (数分かかります)..."
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

if ! groups "$USER" | grep -q '\bdocker\b'; then
  warn "docker グループ未反映のため sudo で実行します。"
  COMPOSE="sudo $COMPOSE"
fi

$COMPOSE pull postgres redis caddy
$COMPOSE build --pull backend frontend
$COMPOSE up -d

echo
info "起動状況:"
$COMPOSE ps

echo
info "========================================================"
info " セットアップ完了！"
info "  URL          : https://$DOMAIN"
info "  ログインID   : $AUTH_USERNAME"
info "  予算上限     : \$$MONTHLY_API_BUDGET_USD / month"
info ""
info " DNS の A レコードが $DOMAIN → このVPSのIP を指していることを"
info " 確認してください。Caddy が自動で Let's Encrypt 証明書を取得します。"
info ""
info " 日次サマリーを Discord に流すには cron に以下を登録:"
info "   0 0 * * * curl -fsS -X POST \\"
info "     -H 'X-Webhook-Secret: $NOTIFICATION_WEBHOOK_SECRET' \\"
info "     https://$DOMAIN/api/notifications/daily-summary"
info "========================================================"
