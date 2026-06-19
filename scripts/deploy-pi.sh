#!/usr/bin/env bash
set -euo pipefail

PI_USER="${TALKTYPE_PI_USER:-pibulus}"
PI_HOST="${TALKTYPE_PI_HOST:-pibulus.local}"
APP_NAME="${TALKTYPE_PI_APP_NAME:-talktype}"
APP_DIR="${TALKTYPE_PI_APP_DIR:-/home/pibulus/apps/talktype}"
BACKUP_DIR="${TALKTYPE_PI_BACKUP_DIR:-/home/pibulus/apps-backups}"
STAGING_ROOT="${TALKTYPE_PI_STAGING_ROOT:-/home/pibulus/apps-staging}"
SERVICE="${TALKTYPE_PI_SERVICE:-talktype}"
SMOKE_HOST="${TALKTYPE_PI_SMOKE_HOST:-127.0.0.1}"
SMOKE_PORT="${TALKTYPE_PI_SMOKE_PORT:-19002}"
LIVE_URL="${TALKTYPE_PI_LIVE_URL:-http://127.0.0.1:9002/}"
APP_ENTRY="${TALKTYPE_PI_APP_ENTRY:-index.js}"
BUILD_TARGET="${TALKTYPE_PI_BUILD_TARGET:-.}"
ARCHIVE_BACKUP="${TALKTYPE_PI_ARCHIVE_BACKUP:-false}"
REMOTE="${PI_USER}@${PI_HOST}"
STAMP="$(date +%Y%m%d-%H%M%S)"
STAGING_DIR="${STAGING_ROOT}/${APP_NAME}-${STAMP}"
BACKUP_PATH="${BACKUP_DIR}/${APP_NAME}-${STAMP}"
PREVIOUS_DIR="${APP_DIR}.previous-${STAMP}"

ssh_cmd=(ssh -o StrictHostKeyChecking=accept-new)
rsync_rsh="ssh -o StrictHostKeyChecking=accept-new"

if [[ -n "${SSHPASS:-}" ]]; then
  ssh_cmd=(sshpass -e ssh -o StrictHostKeyChecking=accept-new)
  rsync_rsh="sshpass -e ssh -o StrictHostKeyChecking=accept-new"
fi

remote_bash() {
  "${ssh_cmd[@]}" "$REMOTE" bash -s -- "$@"
}

if [[ "$BUILD_TARGET" == "." ]]; then
  REMOTE_BUILD_DIR="$STAGING_DIR"
else
  REMOTE_BUILD_DIR="${STAGING_DIR}/${BUILD_TARGET}"
fi

# Ensure the offline-Whisper ONNX WASM is present BEFORE building. These ~22MB
# files live in static/onnx/ (gitignored, synced from node_modules); they're
# populated by the `prepare` hook on `npm install`, but a bare `npm run build`
# does NOT re-run it — so sync explicitly here or the build silently omits them
# and offline Whisper 404s on the Pi.
npm run sync:onnx

npm run build

# Fail fast if the build didn't include the offline WASM (prevents shipping a
# broken Offline Mode).
if [[ -z "$(find build -path '*onnx*' -name '*.wasm' -print -quit 2>/dev/null)" ]]; then
  printf 'ERROR: build/ has no onnx/*.wasm — offline Whisper would 404. Run `npm run sync:onnx` and rebuild.\n' >&2
  exit 1
fi

remote_bash "$STAGING_DIR" "$BACKUP_DIR" "$REMOTE_BUILD_DIR" <<'REMOTE'
set -euo pipefail

staging_dir="$1"
backup_dir="$2"
remote_build_dir="$3"

rm -rf "$staging_dir"
mkdir -p "$remote_build_dir" "$backup_dir"
printf 'staging=%s\n' "$staging_dir"
REMOTE

rsync -az --delete \
  --exclude node_modules \
  --exclude package.json \
  --exclude package-lock.json \
  -e "$rsync_rsh" \
  build/ "$REMOTE:$REMOTE_BUILD_DIR/"

rsync -az -e "$rsync_rsh" package.json package-lock.json "$REMOTE:$STAGING_DIR/"

remote_bash "$APP_DIR" "$STAGING_DIR" <<'REMOTE'
set -euo pipefail

app_dir="$1"
staging_dir="$2"

if [[ -d "$app_dir" ]]; then
  while IFS= read -r env_file; do
    cp -p "$env_file" "$staging_dir/"
  done < <(find "$app_dir" -maxdepth 1 -type f \( -name ".env" -o -name ".env.*" \) -print)
fi
REMOTE

remote_bash "$STAGING_DIR" "$SMOKE_HOST" "$SMOKE_PORT" "$APP_ENTRY" <<'REMOTE'
set -euo pipefail

staging_dir="$1"
smoke_host="$2"
smoke_port="$3"
app_entry="$4"
smoke_log="$staging_dir/.smoke.log"
zero_file=""
asset_roots=()

cd "$staging_dir"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund

test -s "$staging_dir/$app_entry"
for dir in client server build/client build/server; do
  if [[ -d "$staging_dir/$dir" ]]; then
    asset_roots+=("$staging_dir/$dir")
  fi
done

if [[ "${#asset_roots[@]}" -gt 0 ]]; then
  zero_file="$(find "${asset_roots[@]}" -type f -size 0 -print -quit)"
  if [[ -n "$zero_file" ]]; then
    printf 'zero-byte build file: %s\n' "$zero_file" >&2
    exit 1
  fi
fi

PORT="$smoke_port" \
HOST="$smoke_host" \
ORIGIN="http://${smoke_host}:${smoke_port}" \
  node "$app_entry" >"$smoke_log" 2>&1 &
smoke_pid=$!

cleanup_smoke() {
  kill "$smoke_pid" >/dev/null 2>&1 || true
  wait "$smoke_pid" >/dev/null 2>&1 || true
}
trap cleanup_smoke EXIT

smoke_ok=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 "http://${smoke_host}:${smoke_port}/" >/dev/null; then
    smoke_ok=1
    break
  fi

  if ! kill -0 "$smoke_pid" >/dev/null 2>&1; then
    cat "$smoke_log" >&2
    exit 1
  fi

  sleep 1
done

if [[ "$smoke_ok" != "1" ]]; then
  cat "$smoke_log" >&2
  printf 'smoke test timed out on port %s\n' "$smoke_port" >&2
  exit 1
fi

cleanup_smoke
trap - EXIT
printf 'smoke=ok\n'
REMOTE

remote_bash \
  "$APP_DIR" \
  "$STAGING_DIR" \
  "$BACKUP_PATH" \
  "$PREVIOUS_DIR" \
  "$SERVICE" \
  "$LIVE_URL" \
  "$APP_ENTRY" \
  "$ARCHIVE_BACKUP" <<'REMOTE'
set -euo pipefail

app_dir="$1"
staging_dir="$2"
backup_path="$3"
previous_dir="$4"
service="$5"
live_url="$6"
app_entry="$7"
archive_backup="$8"

require_safe_path() {
  case "${1:-}" in
    "" | "/" | "/home" | "/home/pibulus" | "/home/pibulus/apps")
      printf 'unsafe deploy path: %s\n' "$1" >&2
      exit 1
      ;;
  esac
}

rollback() {
  status=$?
  if [[ "$status" -ne 0 && -d "$previous_dir" ]]; then
    printf 'deploy failed; rolling back to previous app dir\n' >&2
    rm -rf "$app_dir"
    mv "$previous_dir" "$app_dir"
    sudo -n systemctl restart "$service" || true
  fi
  exit "$status"
}
trap rollback EXIT

require_safe_path "$app_dir"
require_safe_path "$staging_dir"
require_safe_path "$backup_path"
require_safe_path "$previous_dir"

test -d "$staging_dir"
test -s "$staging_dir/$app_entry"

rm -rf "$previous_dir"
mkdir -p "$backup_path"

if [[ -e "$app_dir" || -L "$app_dir" ]]; then
  if [[ "$archive_backup" == "true" ]]; then
    rsync -a --delete "$app_dir/" "$backup_path/"
  else
    {
      printf 'archive_backup=false\n'
      printf 'app_dir=%s\n' "$app_dir"
      printf 'created_at=%s\n' "$(date -Is)"
      printf 'note=%s\n' 'Full rollback copy is kept only during deploy; set TALKTYPE_PI_ARCHIVE_BACKUP=true for a full historical archive.'
    } >"$backup_path/deploy-info.txt"
  fi

  mv "$app_dir" "$previous_dir"
fi

mv "$staging_dir" "$app_dir"
sudo -n systemctl restart "$service"
systemctl is-active "$service"

live_ok=0
for _ in $(seq 1 20); do
  if curl -fsS --max-time 5 "$live_url" >/dev/null; then
    live_ok=1
    break
  fi
  sleep 1
done

if [[ "$live_ok" != "1" ]]; then
  printf 'live smoke test failed: %s\n' "$live_url" >&2
  exit 1
fi

# Verify the offline-Whisper WASM is actually served (the node adapter reads its
# static set at boot, so a missing/late onnx file 404s here). Failing this trips
# the rollback trap rather than silently shipping a broken Offline Mode.
onnx_url="${live_url%/}/onnx/ort-wasm-simd-threaded.asyncify.wasm"
if ! curl -fsS --max-time 8 -o /dev/null "$onnx_url"; then
  printf 'offline WASM smoke test failed (404?): %s\n' "$onnx_url" >&2
  exit 1
fi

rm -rf "$previous_dir"
trap - EXIT
printf 'backup=%s\n' "$backup_path"
printf 'deployed=%s\n' "$app_dir"
REMOTE
