#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${PROJECT_ROOT}/spk-build"
NODE_VERSION="20.11.1"  # LTS, linux-x64
NODE_TARBALL="node-v${NODE_VERSION}-linux-x64.tar.gz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}"

echo "=== FBS SPK Builder ==="
echo "Projectroot: ${PROJECT_ROOT}"

# 1. Opruimen
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/package/app"
mkdir -p "${BUILD_DIR}/package/node"
mkdir -p "${BUILD_DIR}/spk/scripts"

# 2. Next.js build
echo "--- Next.js build ---"
cd "${PROJECT_ROOT}"
npm ci
npm run build

# 3. App bestanden kopiëren
echo "--- App bestanden kopiëren ---"
cp -r .next "${BUILD_DIR}/package/app/"
cp -r public "${BUILD_DIR}/package/app/" 2>/dev/null || true
cp package.json "${BUILD_DIR}/package/app/"
cp package-lock.json "${BUILD_DIR}/package/app/"

# 4. Production dependencies installeren (linux-x64)
echo "--- Dependencies installeren voor linux-x64 ---"
cd "${BUILD_DIR}/package/app"
npm ci --omit=dev --target_arch=x64 --target_platform=linux

# 5. Node.js binary downloaden
echo "--- Node.js ${NODE_VERSION} downloaden ---"
cd "${BUILD_DIR}"
if [ ! -f "${NODE_TARBALL}" ]; then
    curl -fsSL --ssl-no-revoke "${NODE_URL}" -o "${NODE_TARBALL}"
fi
tar -xzf "${NODE_TARBALL}" --strip-components=1 -C package/node

# 6. SPK structuur opbouwen
echo "--- SPK structuur opbouwen ---"
cp "${SCRIPT_DIR}/INFO" "${BUILD_DIR}/spk/"
cp "${SCRIPT_DIR}/installer" "${BUILD_DIR}/spk/scripts/"
cp "${SCRIPT_DIR}/start-stop-status" "${BUILD_DIR}/spk/scripts/"
chmod +x "${BUILD_DIR}/spk/scripts/installer"
chmod +x "${BUILD_DIR}/spk/scripts/start-stop-status"

# 7. package.tgz maken
echo "--- package.tgz inpakken ---"
cd "${BUILD_DIR}/package"
tar -czf "${BUILD_DIR}/spk/package.tgz" --transform 's|^\./||' .

# 8. SPK maken
echo "--- SPK inpakken ---"
cd "${BUILD_DIR}/spk"
tar -czf "${PROJECT_ROOT}/fbs-v1.0.0-x86_64.spk" --transform 's|^\./||' .

echo ""
echo "=== Klaar! ==="
echo "SPK: ${PROJECT_ROOT}/fbs-v1.0.0-x86_64.spk"
