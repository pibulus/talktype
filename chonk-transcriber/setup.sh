#!/usr/bin/env bash
# ===================================================================
# One-shot setup for the TalkType Chonk transcriber.
# Run ON the chonk server (pibulus.local): builds transcribe.cpp,
# downloads the model, self-tests the wrapper.
#
#   bash setup.sh              # CPU build (OpenBLAS-accelerated decoder)
#   VULKAN=1 bash setup.sh     # + Vulkan on the UHD 630 iGPU
#   MODEL_URL=... bash setup.sh  # different model
# ===================================================================
set -euo pipefail

BASE="${BASE:-$HOME/talktype-transcriber}"
MODEL_URL="${MODEL_URL:-https://huggingface.co/handy-computer/parakeet-tdt-0.6b-v3/resolve/main/parakeet-tdt-0.6b-v3-Q8_0.gguf}"
MODEL_FILE="$(basename "$MODEL_URL")"

echo "==> deps"
sudo apt-get update -qq
sudo apt-get install -y git cmake build-essential ffmpeg libopenblas-dev curl
if [ -n "${VULKAN:-}" ]; then
	sudo apt-get install -y libvulkan-dev glslc
fi
command -v node >/dev/null || {
	echo "node is required (sudo apt-get install -y nodejs)"
	exit 1
}

echo "==> clone + build transcribe.cpp"
mkdir -p "$BASE/models"
cd "$BASE"
[ -d transcribe.cpp ] || git clone https://github.com/handy-computer/transcribe.cpp
cd transcribe.cpp
git pull --ff-only
cmake -B build ${VULKAN:+-DTRANSCRIBE_VULKAN=ON}
cmake --build build -j"$(nproc)"
CLI="$BASE/transcribe.cpp/build/bin/transcribe-cli"
[ -x "$CLI" ] || { echo "build finished but $CLI missing — check cmake output"; exit 1; }

echo "==> model: $MODEL_FILE"
if [ ! -f "$BASE/models/$MODEL_FILE" ]; then
	# --fail so a bad URL/repo name dies loudly instead of saving an HTML error page
	curl -L --fail --progress-bar -o "$BASE/models/$MODEL_FILE.part" "$MODEL_URL"
	mv "$BASE/models/$MODEL_FILE.part" "$BASE/models/$MODEL_FILE"
fi

echo "==> install wrapper"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/server.mjs" "$BASE/server.mjs"
node "$BASE/server.mjs" --selftest

echo "==> smoke test the CLI"
"$CLI" --help 2>&1 | head -20 || true

cat <<EOF

Done. Next:
  1. Sanity-run:  MODEL="$BASE/models/$MODEL_FILE" node "$BASE/server.mjs"
     then from the Mac: curl -s http://pibulus.local:7331/health
  2. Install the service:
     sudo cp "$SCRIPT_DIR/talktype-transcriber.service" /etc/systemd/system/
     sudo systemctl daemon-reload && sudo systemctl enable --now talktype-transcriber
  3. Point TalkType at it (fleet system, NOT hand-edited env):
     add CHONK_TRANSCRIBE_URL=http://192.168.0.136:7331 to TALKTYPE_EXTRA_ENV
     in ~/.config/fleet/keys.env on the Mac, then: apikey sync talktype
EOF
