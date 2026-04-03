#!/bin/bash
set -e

SPK_DIR="/volume1/Downloads/scripts/spk"
SPK_IN="/volume1/Downloads/fbs-v1.0.0-x86_64.spk"
BUILD_DIR="/volume1/Downloads/FBS-build"
SPK_OUT="/volume1/Downloads/fbs-v1.0.0-x86_64-signed.spk"

echo "=== FBS SPK Builder op NAS ==="

# 1. Werkmap aanmaken
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/spkdir/scripts"

# 2. Bestanden uit bestaande SPK en scripts klaarzetten
echo "--- Bestanden klaarzetten ---"
tar -xzf "${SPK_IN}" -C "${BUILD_DIR}"
cp "${SPK_DIR}/INFO" "${BUILD_DIR}/spkdir/"
cp "${BUILD_DIR}/package.tgz" "${BUILD_DIR}/spkdir/"
cp "${SPK_DIR}/installer" "${BUILD_DIR}/spkdir/scripts/"
cp "${SPK_DIR}/start-stop-status" "${BUILD_DIR}/spkdir/scripts/"
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
        pkg_make_spk . /spk fbs-v1.0.0-x86_64-signed
    "

echo ""
echo "=== Klaar ==="
echo "SPK: ${SPK_OUT}"
