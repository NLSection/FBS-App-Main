#!/bin/bash
set -e

BUILD_DIR="/volume1/downloads/FBS-build"
SPK_OUT="/volume1/downloads/fbs-v1.0.0-x86_64.spk"

echo "=== FBS SPK Builder op NAS ==="

# 1. Werkmap aanmaken
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/spkdir/scripts"

echo "Klaar om bestanden te ontvangen."
echo "Kopieer nu vanaf je PC naar /volume1/downloads/FBS-build/:"
echo "  - package.tgz"
echo "  - INFO"
echo "  - installer"
echo "  - start-stop-status"
echo ""
echo "Druk daarna op Enter om verder te gaan..."
read

# 2. Bestanden klaarzetten
cp "${BUILD_DIR}/INFO" "${BUILD_DIR}/spkdir/"
cp "${BUILD_DIR}/package.tgz" "${BUILD_DIR}/spkdir/"
cp "${BUILD_DIR}/installer" "${BUILD_DIR}/spkdir/scripts/"
cp "${BUILD_DIR}/start-stop-status" "${BUILD_DIR}/spkdir/scripts/"
chmod +x "${BUILD_DIR}/spkdir/scripts/installer"
chmod +x "${BUILD_DIR}/spkdir/scripts/start-stop-status"

# 3. SPK bouwen via Docker
echo "--- SPK bouwen via Docker ---"
docker run --rm \
    -v "${BUILD_DIR}:/spk" \
    ghcr.io/synocommunity/spksrc \
    bash -c "
        source /pkgscripts-ng/include/pkg_util.sh &&
        cd /spk/spkdir &&
        pkg_make_spk . /spk fbs-v1.0.0-x86_64
    "

echo ""
echo "=== Klaar ==="
echo "SPK: ${SPK_OUT}"
