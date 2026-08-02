#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="$(osascript -e 'POSIX path of (choose folder with prompt "Choose your existing fantasy-next-move GitHub repository folder")')"
TARGET="${TARGET%/}"

fail() {
  echo
  echo "INSTALLATION STOPPED"
  echo "$1"
  echo
  read -r -p "Press Return to close this window..." _
  exit 1
}

[[ -d "$TARGET/.git" ]] || fail "The selected folder is not a Git repository. Choose the existing fantasy-next-move folder used by GitHub Desktop."

REMOTE="$(git -C "$TARGET" remote get-url origin 2>/dev/null || true)"
[[ "$REMOTE" == *"csgentry/fantasy-next-move"* ]] || fail "The selected repository is not csgentry/fantasy-next-move. Nothing was changed."

STATUS="$(git -C "$TARGET" status --porcelain)"
[[ -z "$STATUS" ]] || fail "GitHub Desktop still shows uncommitted changes. Commit or discard them first, then run this installer again. Nothing was changed."

rsync -a --delete \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.*.local' \
  --exclude='.vercel' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='validation-stubs.d.ts' \
  --exclude='tsconfig.tsbuildinfo' \
  "$SCRIPT_DIR/" "$TARGET/"

find "$TARGET" -name '.DS_Store' -delete 2>/dev/null || true

chmod +x "$TARGET/INSTALL_COMPLETE_PROJECT.command" 2>/dev/null || true

echo
echo "FantasyNextMove 1.3C was copied successfully."
echo "Open GitHub Desktop to review, commit, and push the changes."
echo
echo "After deployment, run the included Supabase migration and add CRON_SECRET in Vercel."
echo
read -r -p "Press Return to close this window..." _
