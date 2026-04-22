# Database Setup Guide

## PostgreSQL Setup from Scratch

### Option 1: Using Docker Compose (Recommended for Development)

**1. Start PostgreSQL with Docker Compose:**

```bash
# With local postgres
docker compose --profile with-db up -d postgres

# Or using docker-compose.local.yml
docker compose -f docker-compose.local.yml --profile with-db up -d postgres
```

**2. Verify PostgreSQL is running:**

```bash
docker compose ps
docker compose logs postgres
```

**3. Connect to PostgreSQL:**

```bash
# Using psql from the container
docker compose exec postgres psql -U dashtec -d dashtec

# Or from your host (if you have psql installed)
psql -h localhost -p 5432 -U dashtec -d dashtec
# Password: dashtec
```

**4. Update DATABASE_URL in .env files:**

```bash
# apps/web/.env
DATABASE_URL=postgresql://dashtec:dashtec@localhost:5432/dashtec

# packages/indexer-ponder/.env
DATABASE_URL=postgresql://dashtec:dashtec@localhost:5432/dashtec

# packages/indexer-custom/.env
DATABASE_URL=postgresql://dashtec:dashtec@localhost:5432/dashtec
```

**5. Run Prisma Migrations:**

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### Option 2: External PostgreSQL Server

**1. Create Database and User:**

```sql
-- Connect as postgres superuser
psql -U postgres

-- Create user
CREATE USER dashtec WITH PASSWORD 'your-secure-password';

-- Create database
CREATE DATABASE dashtec OWNER dashtec;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dashtec TO dashtec;

-- Connect to the database
\c dashtec

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO dashtec;
```

**2. Configure PostgreSQL for Remote Access:**

Edit `postgresql.conf`:
```conf
listen_addresses = '*'  # Or specific IP
```

Edit `pg_hba.conf`:
```conf
# Allow connections from your application servers
host    dashtec    dashtec    10.0.0.0/8    scram-sha-256
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

**3. Update DATABASE_URL:**

```bash
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql://dashtec:your-secure-password@db-server.example.com:5432/dashtec
```

**4. Run Migrations:**

```bash
pnpm db:migrate
```

### Option 3: Managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)

**1. Create managed PostgreSQL instance** through your cloud provider

**2. Get connection details:**
- Host: `your-db.xxxxx.us-east-1.rds.amazonaws.com`
- Port: `5432`
- Database: `dashtec`
- Username: `dashtec`
- Password: (from creation)

**3. Update DATABASE_URL:**

```bash
DATABASE_URL=postgresql://dashtec:password@your-db.xxxxx.us-east-1.rds.amazonaws.com:5432/dashtec
```

**4. Enable SSL (recommended):**

```bash
DATABASE_URL=postgresql://dashtec:password@your-db.example.com:5432/dashtec?sslmode=require
```

**5. Run Migrations:**

```bash
pnpm db:migrate
```

## Redis Setup

### Option 1: Using Docker Compose (Development)

**1. Start Redis with Docker Compose:**

```bash
docker compose --profile with-redis up -d redis

# Or using docker-compose.local.yml
docker compose -f docker-compose.local.yml --profile with-redis up -d redis
```

**2. Update REDIS_URL in .env files:**

```bash
# apps/web/.env (if using caching)
REDIS_URL=redis://localhost:6379/0

# packages/indexer-custom/.env (if using caching)
REDIS_URL=redis://localhost:6379/0
```

**3. Test connection:**

```bash
docker compose exec redis redis-cli ping
# Should return: PONG
```

### Option 2: Redis with Password (Recommended for Production)

**1. Create docker-compose override for Redis with password:**

Create `docker-compose.override.yml`:

```yaml
version: '3.8'

services:
  redis:
    command: redis-server --requirepass your-strong-password
    environment:
      REDIS_PASSWORD: your-strong-password
```

**2. Update REDIS_URL with password:**

```bash
# Format: redis://[:password@]host:port/db
REDIS_URL=redis://:your-strong-password@localhost:6379/0
```

**3. Test connection:**

```bash
docker compose exec redis redis-cli -a your-strong-password ping
```

### Option 3: Redis with Username & Password (Redis 6+)

**1. Create Redis ACL configuration file:**

Create `redis/redis.conf`:

```conf
# Enable ACL
aclfile /data/users.acl

# Require password
requirepass your-master-password
```

Create `redis/users.acl`:

```conf
user default off
user dashtec on >your-strong-password ~* &* +@all
```

**2. Update docker-compose to use config:**

```yaml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
      - ./redis/users.acl:/data/users.acl
    command: redis-server /usr/local/etc/redis/redis.conf
```

**3. Update REDIS_URL:**

```bash
# Format: redis://username:password@host:port/db
REDIS_URL=redis://dashtec:your-strong-password@localhost:6379/0
```

### Option 4: External Redis Server

**1. Install Redis on server:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# CentOS/RHEL
sudo yum install redis
```

**2. Configure Redis (`/etc/redis/redis.conf`):**

```conf
# Bind to specific IP
bind 0.0.0.0

# Set password
requirepass your-strong-password

# Enable persistence (optional)
save 900 1
save 300 10
save 60 10000

# AOF persistence (optional)
appendonly yes
```

**3. Start Redis:**

```bash
sudo systemctl enable redis
sudo systemctl start redis
```

**4. Update REDIS_URL:**

```bash
REDIS_URL=redis://:your-strong-password@redis-server.example.com:6379/0
```

### Option 5: Managed Redis (AWS ElastiCache, Google Memorystore, etc.)

**1. Create managed Redis instance** through cloud provider

**2. Get connection details**

**3. Update REDIS_URL:**

```bash
# Without auth
REDIS_URL=redis://your-redis.xxxxx.0001.use1.cache.amazonaws.com:6379/0

# With auth (if enabled)
REDIS_URL=redis://:your-auth-token@your-redis.xxxxx.0001.use1.cache.amazonaws.com:6379/0
```

## Complete Setup Script

Create `scripts/setup-databases.sh`:

```bash
#!/bin/bash
set -e

echo "======================================"
echo "Database Setup"
echo "======================================"

# Start databases with Docker Compose
echo "Starting PostgreSQL and Redis..."
docker compose --profile with-db --profile with-redis up -d postgres redis

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until docker compose exec postgres pg_isready -U dashtec; do
  sleep 1
done

echo "PostgreSQL is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis..."
until docker compose exec redis redis-cli ping | grep -q PONG; do
  sleep 1
done

echo "Redis is ready!"

# Update DATABASE_URL in .env files
echo ""
echo "Updating .env files..."

# For apps/web
if [ -f apps/web/.env ]; then
    sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=postgresql://dashtec:dashtec@localhost:5432/dashtec|' apps/web/.env
    sed -i.bak 's|REDIS_URL=.*|REDIS_URL=redis://localhost:6379/0|' apps/web/.env
    rm apps/web/.env.bak
fi

# For packages/indexer-ponder
if [ -f packages/indexer-ponder/.env ]; then
    sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=postgresql://dashtec:dashtec@localhost:5432/dashtec|' packages/indexer-ponder/.env
    rm packages/indexer-ponder/.env.bak
fi

# For packages/indexer-custom
if [ -f packages/indexer-custom/.env ]; then
    sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=postgresql://dashtec:dashtec@localhost:5432/dashtec|' packages/indexer-custom/.env
    sed -i.bak 's|REDIS_URL=.*|REDIS_URL=redis://localhost:6379/0|' packages/indexer-custom/.env
    rm packages/indexer-custom/.env.bak
fi

echo ""
echo "Running Prisma migrations..."
pnpm db:generate
pnpm db:migrate

echo ""
echo "======================================"
echo "✅ Databases are ready!"
echo "======================================"
echo ""
echo "PostgreSQL: postgresql://dashtec:dashtec@localhost:5432/dashtec"
echo "Redis: redis://localhost:6379/0"
echo ""
echo "Commands:"
echo "  docker compose logs postgres  - View PostgreSQL logs"
echo "  docker compose logs redis     - View Redis logs"
echo "  pnpm db:studio                - Open Prisma Studio"
echo ""
```

Make it executable:

```bash
chmod +x scripts/setup-databases.sh
```

## Database Connection Strings

### PostgreSQL Format

```
postgresql://[user[:password]@][host][:port][/database][?parameters]
```

**Examples:**

```bash
# Local development
postgresql://dashtec:dashtec@localhost:5432/dashtec

# Production with SSL
postgresql://dashtec:password@db.example.com:5432/dashtec?sslmode=require

# AWS RDS
postgresql://dashtec:password@mydb.xxxxx.us-east-1.rds.amazonaws.com:5432/dashtec?sslmode=require

# Connection pooling with PgBouncer
postgresql://dashtec:password@pgbouncer.example.com:6432/dashtec

# Multiple parameters
postgresql://user:pass@host:5432/db?sslmode=require&connect_timeout=10
```

### Redis Format

```
redis://[:password@]host[:port][/database]
```

**Examples:**

```bash
# No password
redis://localhost:6379/0

# With password
redis://:mypassword@localhost:6379/0

# With username and password (Redis 6+)
redis://username:password@localhost:6379/0

# AWS ElastiCache
redis://my-redis.xxxxx.0001.use1.cache.amazonaws.com:6379/0

# With TLS
rediss://:password@redis.example.com:6380/0
```

## Troubleshooting

### PostgreSQL Connection Errors

**"connection refused"**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Verify port
netstat -an | grep 5432
```

**"authentication failed"**
```bash
# Verify credentials
docker compose exec postgres psql -U dashtec -d dashtec

# Reset password
docker compose exec postgres psql -U postgres -c "ALTER USER dashtec PASSWORD 'newpassword';"
```

### Redis Connection Errors

**"NOAUTH Authentication required"**
```bash
# Redis has a password, update REDIS_URL
REDIS_URL=redis://:your-password@localhost:6379/0
```

**"connection refused"**
```bash
# Check if Redis is running
docker compose ps redis

# Check logs
docker compose logs redis
```

## Security Best Practices

1. **Use strong passwords** for production
2. **Enable SSL/TLS** for remote connections
3. **Use connection pooling** (PgBouncer for PostgreSQL)
4. **Limit network access** with firewalls
5. **Regular backups** of PostgreSQL
6. **Use managed services** for production when possible
7. **Rotate credentials** regularly
8. **Use secrets management** (Vault, AWS Secrets Manager)
9. **Monitor connections** and query performance
10. **Keep software updated**
