#!/bin/bash
set -e

NAS_IP="${1:-}"
NAS_USER="${2:-admin}"
SPK_FILE="$(dirname "$0")/../../fbs-v1.0.0-x86_64.spk"
INSTALL_DIR="/var/packages/FBS/target"
DATA_DIR="/volume1/FBS"

if [ -z "$NAS_IP" ]; then
    echo "Gebruik: $0 <nas-ip> [gebruikersnaam]"
    echo "Voorbeeld: $0 192.168.1.100 admin"
    exit 1
fi

echo "=== FBS SSH Installer ==="
echo "NAS: ${NAS_USER}@${NAS_IP}"
echo "SPK: ${SPK_FILE}"

# 1. Pak package.tgz uit het SPK bestand
echo "--- SPK uitpakken ---"
TMP_DIR=$(mktemp -d)
tar -xzf "${SPK_FILE}" -C "${TMP_DIR}"
tar -xzf "${TMP_DIR}/package.tgz" -C "${TMP_DIR}"
rm "${TMP_DIR}/package.tgz"

# 2. Maak installatiemap aan op NAS
echo "--- Installatiemap aanmaken op NAS ---"
ssh "${NAS_USER}@${NAS_IP}" "mkdir -p ${INSTALL_DIR} && mkdir -p ${DATA_DIR}"

# 3. Kopieer bestanden naar NAS
echo "--- Bestanden kopiëren naar NAS (dit kan even duren) ---"
rsync -avz --progress "${TMP_DIR}/" "${NAS_USER}@${NAS_IP}:${INSTALL_DIR}/"

# 4. Kopieer start-stop-status script
scp "${TMP_DIR}/../scripts/start-stop-status" \
    "${NAS_USER}@${NAS_IP}:/tmp/fbs-start-stop-status"

# 5. Start de app
echo "--- App starten ---"
ssh "${NAS_USER}@${NAS_IP}" "
    chmod +x /tmp/fbs-start-stop-status
    DATA_DIR=${DATA_DIR} INSTALL_DIR=${INSTALL_DIR} \
    /tmp/fbs-start-stop-status start
"

echo ""
echo "=== Klaar ==="
echo "App bereikbaar op: http://${NAS_IP}:3000"

# Opruimen
rm -rf "${TMP_DIR}"
