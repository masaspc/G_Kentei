# G検定攻略サイト (G-Kentei Master)

G検定 2026 #4 に向けた個人学習プラットフォーム。Claude API 連携による解説生成・質問応答機能を備える。

詳細な要件は [docs/requirements.md](./docs/requirements.md) を参照。

## 構成

| レイヤ | 技術 |
| --- | --- |
| Frontend | Next.js 15 (App Router) + Tailwind CSS v4 |
| Backend | FastAPI (Python 3.12) + SQLAlchemy 2.0 + Alembic |
| DB | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| LLM | Anthropic Claude API (Haiku 4.5 / Sonnet 4.6) |

## 起動 (開発環境)

```bash
cp .env.example .env
# .env を編集 (ANTHROPIC_API_KEY などを設定)

# 初回のみ: ログインパスワードの bcrypt ハッシュを生成して .env の AUTH_PASSWORD_HASH に貼り付ける
docker compose run --rm backend python -m app.cli.hash_password

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

## ディレクトリ構成

```
.
├── backend/        # FastAPI
├── frontend/       # Next.js
├── docs/           # 要件定義など
├── docker-compose.yml
└── .env.example
```

## 開発フェーズ

| Phase | 期間 | 内容 |
| --- | --- | --- |
| Phase 0 | 5/11 - 5/17 | 開発環境構築 (このリポジトリの初期化) |
| Phase 1 (MVP) | 5/18 - 5/31 | 一問一答演習・問題管理・インポート |
| Phase 2 | 6/01 - 6/14 | 学習履歴・SRS・Claude 解説生成 |
| Phase 3 | 6/15 - 6/28 | 模擬試験・Claude チャット・問題自動生成 |
| Phase 4 | 6/29 - 7/04 | 安定運用・受験 |
