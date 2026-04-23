#!/bin/bash
set -e

echo "======================================"
echo "Building Dashtec Monorepo for Production"
echo "======================================"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed"
    exit 1
fi

# Clean previous builds
echo ""
echo "📦 Cleaning previous builds..."
pnpm clean

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
pnpm db:generate

# Build all packages
echo ""
echo "🚀 Building all packages..."
pnpm build

echo ""
echo "======================================"
echo "✅ Build completed successfully!"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Configure environment: pnpm env:propagate mainnet"
echo "  2. Run database migrations: pnpm db:migrate"
echo "  3. Start services using PM2 (see scripts/deploy-*.sh)"
echo ""
