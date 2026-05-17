#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSION_REPO="${TALKTYPE_EXTENSION_REPO:-"${ROOT_DIR}/../talktype_extension"}"
SOURCE_DIR="${EXTENSION_REPO}/src"
DOWNLOAD_DIR="${ROOT_DIR}/static/downloads"
PACKAGE_NAME="talktype-extension"
ZIP_PATH="${DOWNLOAD_DIR}/${PACKAGE_NAME}.zip"
CHECKSUM_PATH="${ZIP_PATH}.sha256"
TMP_DIR="$(mktemp -d)"

cleanup() {
	rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

if [[ ! -f "${SOURCE_DIR}/manifest.json" ]]; then
	echo "Extension manifest not found at ${SOURCE_DIR}/manifest.json" >&2
	exit 1
fi

VERSION="$(
	node -e "const m=require(process.argv[1]); process.stdout.write(m.version || 'dev')" \
		"${SOURCE_DIR}/manifest.json"
)"
PACKAGE_DIR="${TMP_DIR}/${PACKAGE_NAME}"

mkdir -p "${PACKAGE_DIR}" "${DOWNLOAD_DIR}"
cp -Rp "${SOURCE_DIR}/." "${PACKAGE_DIR}/"

if [[ -f "${EXTENSION_REPO}/README.md" ]]; then
	cp -p "${EXTENSION_REPO}/README.md" "${PACKAGE_DIR}/README.md"
fi

(
	cd "${TMP_DIR}"
	find "${PACKAGE_NAME}" -type f -print | LC_ALL=C sort | zip -q -X "${ZIP_PATH}" -@
)

shasum -a 256 "${ZIP_PATH}" | awk '{print $1}' > "${CHECKSUM_PATH}"

echo "Packaged TalkType extension ${VERSION}"
echo "${ZIP_PATH}"
echo "${CHECKSUM_PATH}"
