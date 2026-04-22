#!/bin/bash
set -e

echo "======================================"
echo "Redis Setup"
echo "======================================"

# Load .env if exists to get custom ports
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

NETWORK=${1:-mainnet}

if [ "$NETWORK" != "mainnet" ] && [ "$NETWORK" != "testnet" ]; then
    echo "Error: Network must be 'mainnet' or 'testnet'"
    exit 1
fi

echo "Setting up Redis for: $NETWORK"

# Set ports based on network
if [ "$NETWORK" == "mainnet" ]; then
    REDIS_PORT=${REDIS_PORT:-${REDIS_MAINNET_PORT:-6379}}
    export REDIS_MAINNET_PORT=$REDIS_PORT
    REDIS_SERVICE="redis-mainnet"
else
    REDIS_PORT=${REDIS_PORT:-${REDIS_TESTNET_PORT:-6380}}
    export REDIS_TESTNET_PORT=$REDIS_PORT
    REDIS_SERVICE="redis-testnet"
fi

REDIS_PASSWORD=${REDIS_PASSWORD:-dashtec}

echo "Using port: Redis=$REDIS_PORT"

# Start Redis with Docker Compose
echo "Starting Redis for $NETWORK..."
docker compose --profile $NETWORK up -d $REDIS_SERVICE

# Wait for Redis to be ready
echo "Waiting for Redis ($REDIS_SERVICE)..."
until docker compose exec $REDIS_SERVICE redis-cli -a ${REDIS_PASSWORD:-dashtec} ping | grep -q PONG; do
  sleep 1
done

echo "Redis is ready!"

# Update REDIS_URL in .env files
echo ""
echo "Updating .env files with Redis URL..."

# For apps/web
if [ -f apps/web/.env ]; then
    sed -i.bak "s|REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASSWORD@localhost:$REDIS_PORT/0|" apps/web/.env
    rm apps/web/.env.bak
fi

# For packages/indexer-custom
if [ -f packages/indexer-custom/.env ]; then
    sed -i.bak "s|REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASSWORD@localhost:$REDIS_PORT/0|" packages/indexer-custom/.env
    rm packages/indexer-custom/.env.bak
fi

echo ""
echo "======================================"
echo "✅ $NETWORK Redis is ready!"
echo "======================================"
echo ""
echo "Redis: redis://:$REDIS_PASSWORD@localhost:$REDIS_PORT/0"
echo ""
echo "Commands:"
echo "  docker compose logs $REDIS_SERVICE - View Redis logs"
echo ""
