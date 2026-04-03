#!/bin/bash
set -e

SPK_FILE="/volume1/Downloads/fbs-v1.0.0-x86_64.spk"
SPK_DIR="/volume1/Downloads/scripts/spk"
INSTALL_DIR="/volume2/Docker/FBS-App"
DATA_DIR="/volume1/FBS"

echo "=== FBS Installer ==="
echo "SPK: ${SPK_FILE}"
echo "Installatiemap: ${INSTALL_DIR}"
echo "Datamap: ${DATA_DIR}"

# 1. Mappen aanmaken
echo "--- Mappen aanmaken ---"
mkdir -p "${INSTALL_DIR}"
mkdir -p "${DATA_DIR}"

# 2. package.tgz uitpakken uit SPK naar INSTALL_DIR
echo "--- SPK uitpakken ---"
TMP_DIR=$(mktemp -d)
tar -xzf "${SPK_FILE}" -C "${TMP_DIR}"
tar -xzf "${TMP_DIR}/package.tgz" -C "${INSTALL_DIR}"
rm -rf "${TMP_DIR}"

# 3. Symlink database
echo "--- Database symlink aanmaken ---"
ln -sf "${DATA_DIR}/fbs.db" "${INSTALL_DIR}/fbs.db"

# 4. Service script installeren
echo "--- Service script installeren ---"
cp "${SPK_DIR}/start-stop-status" /usr/local/bin/fbs-service
chmod +x /usr/local/bin/fbs-service

# 5. App starten
echo "--- App starten ---"
fbs-service start

echo ""
echo "=== Klaar ==="
echo "App bereikbaar op: http://$(hostname -I | awk '{print $1}'):3000"
