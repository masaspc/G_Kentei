#!/usr/bin/env bash
# G検定攻略サイト — スターター問題生成スクリプト
#
# Claude API を使って G検定 の主要シラバス分野から問題を自動生成します。
# 実行前にサイトが起動している必要があります。
#
# 使い方:
#   bash scripts/seed-questions.sh [API_URL]
#   例: bash scripts/seed-questions.sh https://g-kentei.example.com
#   例: bash scripts/seed-questions.sh http://localhost:8000  (ローカル開発)

set -euo pipefail

API_URL="${1:-http://localhost:8000}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

if ! command -v curl >/dev/null 2>&1; then
  error "curl が必要です。"
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  error "jq が必要です。Ubuntu: apt-get install -y jq"
  exit 1
fi

echo
info "G検定スターター問題生成"
info "API: $API_URL"
echo

read -rp "管理ユーザー名 [admin]: " USERNAME
USERNAME=${USERNAME:-admin}
read -rsp "管理パスワード: " PASSWORD; echo

# --- ログイン ---
TOKEN=$(curl -sf -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" | jq -r '.access_token')
unset PASSWORD

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  error "ログインに失敗しました。ユーザー名・パスワードを確認してください。"
  exit 1
fi
info "ログイン成功。"

# --- G検定 主要シラバス分野 ---
declare -A CATEGORIES
CATEGORIES=(
  ["AI概論・人工知能とは"]="機械学習の基礎"
  ["機械学習の手法"]="機械学習の基礎"
  ["ディープラーニングの概要"]="ディープラーニングの基礎"
  ["CNN・画像認識"]="ディープラーニングの基礎"
  ["RNN・自然言語処理"]="ディープラーニングの基礎"
  ["Transformer・大規模言語モデル"]="ディープラーニングの応用"
  ["生成AI・拡散モデル"]="ディープラーニングの応用"
  ["AI倫理・公平性"]="AI倫理・社会実装"
  ["AIの法律・ガイドライン"]="AI倫理・社会実装"
  ["AIプロジェクトの進め方"]="AI社会実装"
  ["確率・統計の基礎"]="数学基礎"
  ["線形代数の基礎"]="数学基礎"
)

QUESTION_TYPES=("single" "single" "single" "true_false")
DIFFICULTIES=(1 2 2 3)
TOTAL=0
FAILED=0

for TITLE in "${!CATEGORIES[@]}"; do
  CATEGORY="${CATEGORIES[$TITLE]}"

  for i in 0 1 2; do
    QTYPE="${QUESTION_TYPES[$((i % 4))]}"
    DIFF="${DIFFICULTIES[$((i % 4))]}"

    info "生成中: [${CATEGORY}] ${TITLE} (${QTYPE}/難易度${DIFF})"

    RESP=$(curl -sf -X POST "$API_URL/api/questions/generate" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"category\":\"$CATEGORY\",\"difficulty\":$DIFF,\"question_type\":\"$QTYPE\"}" 2>/dev/null || echo "")

    if [[ -z "$RESP" ]]; then
      warn "生成スキップ (API エラーまたは予算超過): ${TITLE}"
      FAILED=$((FAILED + 1))
      continue
    fi

    # 生成した下書きを問題として保存
    SAVE_RESP=$(echo "$RESP" | jq '{
      question_text: .question_text,
      question_type: .question_type,
      choices: .choices,
      correct_answer: .correct_answer,
      explanation: .explanation,
      explanation_source: "claude_sonnet",
      syllabus_category: "'"$CATEGORY"'",
      subcategory: "'"$TITLE"'",
      difficulty: '"$DIFF"',
      tags: .tags,
      reference_links: [],
      source: "Claude Sonnet 4.6 (seed)",
      is_active: true
    }' | curl -sf -X POST "$API_URL/api/questions" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d @- 2>/dev/null || echo "")

    if [[ -z "$SAVE_RESP" ]]; then
      warn "保存失敗: ${TITLE}"
      FAILED=$((FAILED + 1))
    else
      TOTAL=$((TOTAL + 1))
    fi

    # API レート制限を避けるため少し待機
    sleep 2
  done
done

echo
info "========================================"
info " 完了: ${TOTAL} 問生成・保存"
if [[ $FAILED -gt 0 ]]; then
  warn " 失敗: ${FAILED} 件 (Claude API 予算超過の可能性あり)"
fi
info ""
info " 次のステップ:"
info "  1. ${API_URL%:*}/reference にアクセスして問題を確認"
info "  2. 管理画面で内容を確認・修正してください"
info "========================================"
