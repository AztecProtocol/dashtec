#!/bin/bash
set -e

echo "======================================"
echo "Pushing Images to Registry"
echo "======================================"

# Configuration
REGISTRY=${REGISTRY:-"your-registry.example.com"}
VERSION=${VERSION:-"latest"}

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./scripts/push-to-registry.sh <version> <network>"
    echo "Example: ./scripts/push-to-registry.sh v1.0.0 mainnet"
    echo "         ./scripts/push-to-registry.sh v1.0.0 testnet"
    echo ""
    echo "Network is required to ensure proper image tagging"
    exit 1
fi

VERSION=$1
NETWORK=$2

echo "Registry: $REGISTRY"
echo "Version: $VERSION"
echo "Network: $NETWORK"
echo ""

# Check if logged in to registry
echo "🔐 Checking registry authentication..."
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo "⚠️  Not logged in to registry. Attempting to login..."
    docker login $REGISTRY
    if [ $? -ne 0 ]; then
        echo "❌ Login failed. Exiting."
        exit 1
    fi
fi

# Push images
IMAGES=(
    "dashtec-web"
    "dashtec-indexer-ponder"
    "dashtec-materializer"
    "dashtec-indexer-custom"
    "dashtec-sentinel-proxy"
)

for image in "${IMAGES[@]}"; do
    echo "🚀 Pushing $image..."

    # Push network-specific tags only
    docker push ${REGISTRY}/${image}:${VERSION}-${NETWORK}
    docker push ${REGISTRY}/${image}:latest-${NETWORK}
done

echo ""
echo "======================================"
echo "✅ Push Complete!"
echo "======================================"
echo ""
echo "Images available at (${NETWORK}):"
for image in "${IMAGES[@]}"; do
    echo "  - ${REGISTRY}/${image}:${VERSION}-${NETWORK}"
    echo "  - ${REGISTRY}/${image}:latest-${NETWORK}"
done
echo ""
echo "Deploy on VMs:"
echo "  1. Copy docker-compose.production.yml to each VM"
echo "  2. Set up .env files on each VM (ensure NETWORK=${NETWORK})"
echo "  3. Run: docker compose -f docker-compose.production.yml pull"
echo "  4. Run: docker compose -f docker-compose.production.yml up -d"
echo ""
