#!/bin/bash
# Global Codex session initializer
set -euo pipefail

REPO_ROOT=$(pwd)
GLOBAL_SYNC="$HOME/.codex/codex_scripts/sync_repo.sh"

# Ensure helpers exist in the repo
if [ -x "$GLOBAL_SYNC" ]; then
  "$GLOBAL_SYNC" "$REPO_ROOT" >/dev/null 2>&1 || true
fi

printf "\n🎛️  Codex init → repo: %s\n" "$REPO_ROOT"

BOOT_MESSAGE=""
if [ -f "$REPO_ROOT/bootup.sh" ]; then
  if BOOT_MESSAGE=$("$REPO_ROOT/bootup.sh" 2>&1); then
    echo "⚙️  Captured boot context from bootup.sh"
  else
    echo "⚠️  bootup.sh reported an issue (likely network limits)."
  fi
  if [ -n "$BOOT_MESSAGE" ]; then
    if command -v pbcopy >/dev/null 2>&1; then
      printf "%s" "$BOOT_MESSAGE" | pbcopy
      echo "📋 Boot context copied to clipboard. Paste it into Codex after launch."
    else
      TMP_FILE="$(mktemp /tmp/codex_boot.XXXX)"
      printf "%s" "$BOOT_MESSAGE" > "$TMP_FILE"
      echo "📄 Boot context saved to $TMP_FILE (copy/paste into Codex manually)."
    fi
  fi
else
  echo "ℹ️  No bootup.sh detected in repo; nothing to capture."
fi

echo "Files synced: scripts/codex/init.sh, AGENTS.md"
echo "Launch Codex manually when ready (e.g. 'codex --cd $REPO_ROOT')."
