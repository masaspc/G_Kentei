# ConoHa VPS デプロイ手順

最短手順で本番運用までを行うガイドです。

## 0. 前提

- ConoHa VPS (最小 1GB プラン以上を推奨。Claude API 呼び出しがあるため 2GB 推奨)
- Ubuntu 22.04 または 24.04 (ConoHa のテンプレートから選択)
- 公開ドメイン (例: `g-kentei.example.com`) を取得済みで、A レコードを VPS の IP に向けてある
- Anthropic API キー (Claude 機能を使う場合)

## 1. VPS 初期設定

ConoHa のコントロールパネルで VPS を作成したら、SSH ログインして一般ユーザーを作成します:

```bash
# root でログイン直後
adduser g_kentei
usermod -aG sudo g_kentei
# SSH 鍵を g_kentei にもコピー
rsync --archive --chown=g_kentei:g_kentei ~/.ssh /home/g_kentei
# 以降は g_kentei ユーザーで作業
su - g_kentei
```

## 2. リポジトリ取得

```bash
sudo apt-get update -y && sudo apt-get install -y git
git clone https://github.com/masaspc/G_Kentei.git
cd G_Kentei
```

## 3. ワンコマンド・セットアップ

```bash
bash scripts/setup-vps.sh
```

スクリプトが対話的に以下を聞きます:

| 項目 | 例 | 説明 |
|---|---|---|
| 公開ドメイン | `g-kentei.example.com` | Caddy が Let's Encrypt で証明書を自動取得 |
| 管理ユーザー名 | `admin` | ログイン用 |
| 管理パスワード | `********` | bcrypt でハッシュ化され `.env` に保存 |
| Anthropic API キー | `sk-ant-...` | 空でもOK (Claude 機能のみ無効化) |
| 月額予算 USD | `10.0` | この金額を超えると 402 を返す |
| Discord Webhook URL | (任意) | 日次サマリー通知用 |

スクリプトが行うこと:

1. Docker, Docker Compose, UFW のインストール
2. ファイアウォール設定 (22/80/443 のみ許可)
3. JWT_SECRET / POSTGRES_PASSWORD / NOTIFICATION_WEBHOOK_SECRET の自動生成
4. 管理パスワードを bcrypt ハッシュ化
5. `.env` 書き出し (パーミッション 600)
6. Docker イメージのビルドと起動

完了後 `https://<ドメイン>` でアクセスできます。Caddy が初回アクセス時に自動で HTTPS 証明書を取得します (失敗する場合は DNS の伝播待ちです — 数分後に再アクセス)。

## 4. 日次サマリーの自動送信

`scripts/setup-vps.sh` の最後に表示される cron スクリプトを `crontab -e` に追記:

```cron
0 0 * * * curl -fsS -X POST \
  -H 'X-Webhook-Secret: <NOTIFICATION_WEBHOOK_SECRET>' \
  https://<ドメイン>/api/notifications/daily-summary
```

JST で朝 9 時に届けたい場合は UTC 0:00 (`0 0 * * *`) のままで OK です。

## 5. 運用コマンド

```bash
# 状態確認
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# ログ
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy

# 更新 (git pull → 再ビルド → 再起動)
bash scripts/update.sh

# PostgreSQL バックアップ
bash scripts/backup.sh ~/backups
# cron で日次バックアップ:
# 30 3 * * * cd /home/g_kentei/G_Kentei && bash scripts/backup.sh /home/g_kentei/backups
```

## 6. トラブルシュート

| 症状 | 対処 |
|---|---|
| `https://...` に繋がらない / 証明書エラー | `dig <ドメイン>` で A レコードが VPS の IP を指しているか確認 / `docker compose logs caddy` で ACME エラーを確認 |
| ログインで 401 | `.env` の AUTH_USERNAME / AUTH_PASSWORD_HASH を確認、必要なら再生成 |
| Claude API が動かない | `.env` の ANTHROPIC_API_KEY を確認 / `https://<ドメイン>/admin/api-usage` で予算超過していないか |
| バックエンドが起動しない | `docker compose logs backend` を確認、`DATABASE_URL` の整合性を確認 |

## 7. パスワード再設定

```bash
# 新しいハッシュを生成して .env を編集
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend \
  python -m app.cli.hash_password
# 表示されたハッシュで .env の AUTH_PASSWORD_HASH を置換
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend
```
