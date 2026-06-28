#!/usr/bin/env bash
# Slack の #ghost-commit などへ進捗を投稿する。
#
# 使い方:
#   ./scripts/notify-slack.sh "投稿メッセージ"
#
# Webhook URL の渡し方（どちらか）:
#   1) 環境変数: export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX/YYY/ZZZ"
#   2) ファイル: プロジェクト直下に .slack-webhook を置き、URL を1行で書く（.gitignore 済み）
#
# Slack Incoming Webhook の作り方:
#   https://api.slack.com/messaging/webhooks に従い、#ghost-commit 宛の Webhook URL を発行する。
set -euo pipefail

msg="${1:-（メッセージなし）}"

url="${SLACK_WEBHOOK_URL:-}"
if [ -z "$url" ] && [ -f "$(dirname "$0")/../.slack-webhook" ]; then
  url="$(tr -d '[:space:]' < "$(dirname "$0")/../.slack-webhook")"
fi

if [ -z "$url" ]; then
  echo "SLACK_WEBHOOK_URL も .slack-webhook も未設定のため投稿をスキップしました。" >&2
  exit 0
fi

# JSON エスケープ（最低限）
payload=$(printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps({"text": sys.stdin.read()}))')

curl -sS -X POST -H 'Content-type: application/json' --data "$payload" "$url" >/dev/null \
  && echo "Slack へ投稿しました。"
