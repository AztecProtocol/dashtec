#!/bin/bash
set -e

NETWORK=${1:-mainnet}

if [ "$NETWORK" == "mainnet" ]; then
    export DB_HOST=postgres-mainnet
    export REDIS_HOST=redis-mainnet
elif [ "$NETWORK" == "testnet" ]; then
    export DB_HOST=postgres-testnet
    export REDIS_HOST=redis-testnet
else
    echo "Error: Network must be 'mainnet' or 'testnet'"
    echo "Usage: $0 [mainnet|testnet]"
    exit 1
fi

echo "======================================"
echo "Starting Docker services for $NETWORK"
echo "Database Host: $DB_HOST"
echo "Redis Host:    $REDIS_HOST"
echo "======================================"

# Pass all additional arguments to docker compose
shift
docker compose up "$@"
