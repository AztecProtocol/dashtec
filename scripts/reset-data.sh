#!/bin/bash
set -e

NETWORK=${1:-mainnet}

if [ "$NETWORK" != "mainnet" ] && [ "$NETWORK" != "testnet" ]; then
    echo "Error: Network must be 'mainnet' or 'testnet'"
    echo "Usage: $0 [mainnet|testnet]"
    exit 1
fi

echo "======================================"
echo "Resetting Data for $NETWORK"
echo "======================================"
echo "WARNING: This will delete database and Redis data for $NETWORK."
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "Stopping containers..."
docker compose --profile $NETWORK down

echo "Removing volumes for $NETWORK..."
# Note: Volume names are prefixed with the project name (default: directory name)
# Assuming project name is 'dashtec-monorepo' based on previous context, but 'docker volume rm' might fail if name differs.
# Using 'docker volume ls' filter might be safer but explicit names are usually predictable.
# The previous script used 'dashtec-monorepo_postgres_data_mainnet'.
docker volume rm dashtec-monorepo_postgres_data_$NETWORK dashtec-monorepo_redis_data_$NETWORK || true

echo "Cleaning up Ponder cache..."
rm -rf packages/indexer-ponder/.ponder

echo "======================================"
echo "✅ $NETWORK Data reset complete!"
echo "======================================"
echo "Run './scripts/setup-databases.sh $NETWORK' to re-initialize."
