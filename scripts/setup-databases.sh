#!/bin/bash
set -e

echo "======================================"
echo "Database Setup (PostgreSQL only)"
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

echo "Setting up PostgreSQL for: $NETWORK"

# Set ports based on network
if [ "$NETWORK" == "mainnet" ]; then
    POSTGRES_PORT=${POSTGRES_PORT:-${POSTGRES_MAINNET_PORT:-5432}}
    export POSTGRES_MAINNET_PORT=$POSTGRES_PORT
    DB_SERVICE="postgres-mainnet"
else
    POSTGRES_PORT=${POSTGRES_PORT:-${POSTGRES_TESTNET_PORT:-5433}}
    export POSTGRES_TESTNET_PORT=$POSTGRES_PORT
    DB_SERVICE="postgres-testnet"
fi

echo "Using port: PostgreSQL=$POSTGRES_PORT"

# Start PostgreSQL with Docker Compose
echo "Starting PostgreSQL for $NETWORK..."
docker compose --profile $NETWORK up -d $DB_SERVICE

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL ($DB_SERVICE)..."
until docker compose exec $DB_SERVICE pg_isready -U dashtec; do
  sleep 1
done

echo "PostgreSQL is ready!"

# Update DATABASE_URL in .env files
echo ""
echo "Updating .env files..."

# For apps/web
if [ -f apps/web/.env ]; then
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=postgresql://dashtec:dashtec@localhost:$POSTGRES_PORT/dashtec|" apps/web/.env
    sed -i.bak "s|DATABASE_READ_REPLICA_URL=.*|DATABASE_READ_REPLICA_URL=postgresql://dashtec:dashtec@localhost:$POSTGRES_PORT/dashtec|" apps/web/.env
    rm apps/web/.env.bak
fi

# For packages/indexer-ponder
if [ -f packages/indexer-ponder/.env ]; then
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=postgresql://dashtec:dashtec@localhost:$POSTGRES_PORT/dashtec|" packages/indexer-ponder/.env
    sed -i.bak "s|DATABASE_READ_REPLICA_URL=.*|DATABASE_READ_REPLICA_URL=postgresql://dashtec:dashtec@localhost:$POSTGRES_PORT/dashtec|" packages/indexer-ponder/.env
    rm packages/indexer-ponder/.env.bak
fi

# For packages/indexer-custom
if [ -f packages/indexer-custom/.env ]; then
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=postgresql://dashtec:dashtec@localhost:$POSTGRES_PORT/dashtec|" packages/indexer-custom/.env
    sed -i.bak "s|DATABASE_READ_REPLICA_URL=.*|DATABASE_READ_REPLICA_URL=postgresql://dashtec:dashtec@localhost:$POSTGRES_PORT/dashtec|" packages/indexer-custom/.env
    rm packages/indexer-custom/.env.bak
fi

# For packages/database
if [ -f packages/database/.env ]; then
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=postgresql://dashtec:dashtec@localhost:$POSTGRES_PORT/dashtec|" packages/database/.env
    sed -i.bak "s|DATABASE_READ_REPLICA_URL=.*|DATABASE_READ_REPLICA_URL=postgresql://dashtec:dashtec@localhost:$POSTGRES_PORT/dashtec|" packages/database/.env
    rm packages/database/.env.bak
fi

echo ""
echo "Running Prisma migrations..."
pnpm db:generate
pnpm db:migrate

echo ""
echo "======================================"
echo "✅ $NETWORK PostgreSQL is ready!"
echo "======================================"
echo ""
echo "PostgreSQL: postgresql://dashtec:dashtec@localhost:$POSTGRES_PORT/dashtec"
echo ""
echo "Commands:"
echo "  docker compose logs $DB_SERVICE  - View PostgreSQL logs"
echo "  pnpm db:studio                   - Open Prisma Studio"
echo ""
echo "To also setup Redis, run: ./scripts/setup-redis.sh $NETWORK"
echo ""
