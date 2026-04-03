#!/bin/bash
set -e

NAS_IP="${1:-}"
NAS_USER="${2:-admin}"

if [ -z "$NAS_IP" ]; then
    echo "Gebruik: $0 <nas-ip> [gebruikersnaam]"
    echo "Voorbeeld: $0 192.168.1.100 admin"
    exit 1
fi

echo "=== FBS SPK Builder via Docker op NAS ==="

# 1. Maak werkmap aan op NAS
ssh -T "${NAS_USER}@${NAS_IP}" "sudo mkdir -p /volume1/downloads/FBS-build/spkdir/scripts"

# 2. Kopieer SPK bronbestanden naar NAS via /tmp (scp kan niet direct naar sudo-paden)
echo "--- Bronbestanden kopiëren naar NAS ---"
scp scripts/spk/INFO scripts/spk/installer scripts/spk/start-stop-status "${NAS_USER}@${NAS_IP}:/tmp/"
ssh -T "${NAS_USER}@${NAS_IP}" "sudo cp /tmp/INFO /tmp/installer /tmp/start-stop-status /volume1/downloads/FBS-build/"

# 3. Kopieer het package.tgz (al gebouwd door build-spk.sh)
echo "--- package.tgz kopiëren ---"
TMP_DIR=$(mktemp -d)
tar -xzf fbs-v1.0.0-x86_64.spk -C "${TMP_DIR}"
scp "${TMP_DIR}/package.tgz" "${NAS_USER}@${NAS_IP}:/tmp/package.tgz"
ssh -T "${NAS_USER}@${NAS_IP}" "sudo cp /tmp/package.tgz /volume1/downloads/FBS-build/"
rm -rf "${TMP_DIR}"

# 4. Draai spksrc toolkit container op NAS om SPK te bouwen
echo "--- SPK bouwen via Docker op NAS ---"
ssh -T "${NAS_USER}@${NAS_IP}" 'sudo docker run --rm \
        -v /volume1/downloads/FBS-build:/spk \
        ghcr.io/synocommunity/spksrc \
        bash -c "
            cd /spk &&
            mkdir -p spkdir/scripts &&
            cp INFO spkdir/ &&
            cp package.tgz spkdir/ &&
            cp installer spkdir/scripts/ &&
            cp start-stop-status spkdir/scripts/ &&
            chmod +x spkdir/scripts/installer &&
            chmod +x spkdir/scripts/start-stop-status &&
            source /pkgscripts-ng/include/pkg_util.sh &&
            cd spkdir &&
            pkg_make_spk . /spk fbs-v1.0.0-x86_64
        "'

# 5. Download het gebouwde SPK terug naar PC
echo "--- SPK downloaden van NAS ---"
scp "${NAS_USER}@${NAS_IP}:/volume1/downloads/FBS-build/fbs-v1.0.0-x86_64.spk" .

echo ""
echo "=== Klaar ==="
echo "SPK: fbs-v1.0.0-x86_64.spk"
echo "Installeer via DSM Package Center > Handmatig installeren"
