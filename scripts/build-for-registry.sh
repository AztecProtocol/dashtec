#!/bin/bash
set -e

echo "======================================"
echo "Building Images for Registry"
echo "======================================"

# Configuration
REGISTRY=${REGISTRY:-"your-registry.example.com"}
VERSION=${VERSION:-"latest"}

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./scripts/build-for-registry.sh <version> <network>"
    echo "Example: ./scripts/build-for-registry.sh v1.0.0 mainnet"
    echo "         ./scripts/build-for-registry.sh v1.0.0 testnet"
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
    echo "⚠️  Not logged in to registry. Please run:"
    echo "   docker login $REGISTRY"
    echo ""
    read -p "Press Enter after logging in, or Ctrl+C to cancel..."
fi

# Build and tag images
IMAGES=(
    "Web App:apps/web/Dockerfile:dashtec-web"
    "Ponder Indexer:packages/indexer-ponder/Dockerfile:dashtec-indexer-ponder"
    "Materializer:packages/materializer/Dockerfile:dashtec-materializer"
    "Custom Collectors:packages/indexer-custom/Dockerfile:dashtec-indexer-custom"
    "Sentinel Proxy:services/sentinel-proxy-go/Dockerfile:dashtec-sentinel-proxy"
)

for image in "${IMAGES[@]}"; do
    IFS=":" read -r name dockerfile tag <<< "$image"
    echo "📦 Building $name..."

    # Base build command
    CMD="docker build -f $dockerfile"

    # Add network-specific tags only
    # Format: dashtec-web:v1.0.0-mainnet and dashtec-web:latest-mainnet
    CMD="$CMD -t $tag:$VERSION-$NETWORK -t $tag:latest-$NETWORK"
    CMD="$CMD -t $REGISTRY/$tag:$VERSION-$NETWORK -t $REGISTRY/$tag:latest-$NETWORK"

    # Execute build
    CMD="$CMD ."
    eval $CMD

    echo ""
done

echo "======================================"
echo "✅ Build Complete!"
echo "======================================"
echo ""
echo "Images built with network-specific tags:"
for image in "${IMAGES[@]}"; do
    IFS=":" read -r name dockerfile tag <<< "$image"
    echo "  - $REGISTRY/$tag:$VERSION-$NETWORK"
    echo "  - $REGISTRY/$tag:latest-$NETWORK"
done
echo ""
echo "Next steps:"
echo "  1. Push to registry: ./scripts/push-to-registry.sh ${VERSION} ${NETWORK}"
echo "  2. Deploy on VMs: See DEPLOYMENT.md for multi-VM setup"
echo ""
