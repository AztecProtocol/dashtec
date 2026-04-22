# Production Deployment Guide

This guide covers how to build and deploy the Dashtec Monorepo in a production environment using **Docker Compose** or **Kubernetes**.

## Prerequisites

1.  **Docker & Docker Compose** (for VM deployment) or a **Kubernetes Cluster**.
2.  **External Database**: PostgreSQL (v16+) and Redis (v7+).
    *   *Note: Production setups should NOT use the embedded containers.*
3.  **Registry Access**: Ability to push/pull images from a container registry.

---

## 1. Build & Push Images

Use the provided scripts to build and push Docker images to your registry.

```bash
# 1. Set your registry URL
export REGISTRY=registry.example.com
export VERSION=v1.0.0

# 2. Build images
./scripts/build-for-registry.sh $VERSION

# 3. Login to registry
docker login $REGISTRY

# 4. Push images
./scripts/push-to-registry.sh $VERSION

# Optional: Build for specific network (e.g., mainnet)
./scripts/build-for-registry.sh $VERSION mainnet
./scripts/push-to-registry.sh $VERSION mainnet
# This creates tags like: v1.0.0-mainnet
```

---

## 2. Database Migrations

**Crucial:** Before deploying new code, you must update the database schema.

### The `db:deploy` Command
We use `prisma migrate deploy` (via `npm run db:deploy`) which applies pending migrations *without* resetting data.

### Running Migrations (Kubernetes)
Apply the migration job before updating your deployments:

```bash
kubectl apply -f k8s/base/migration-job.yaml
```

### Running Migrations (Docker Compose / Manual)
You can run it from any machine that has access to the DB:

```bash
# From the monorepo root
export DATABASE_URL=postgresql://user:pass@prod-db:5432/dashtec
pnpm --filter @dashtec/database db:deploy
```

---

## 3. Deployment: Docker Compose

Use `docker-compose.production.yml` for deploying to VMs.

### Setup

1.  **Copy Files**: Copy `docker-compose.production.yml` and the `packages/*/` folders (for `.env` structure) to your server.
2.  **Configure Environment**: Create the necessary `.env` files.

**`apps/web/.env`**
```env
DATABASE_URL=postgresql://user:pass@prod-db:5432/dashtec
REDIS_URL=redis://prod-redis:6379/0
NEXT_PUBLIC_API_URL=https://api.dashtec.io
# ... other web vars
```

**`packages/indexer-ponder/.env`**
```env
DATABASE_URL=postgresql://user:pass@prod-db:5432/dashtec
DATABASE_SCHEMA=ponder_prod
# ... other ponder vars
```

**`packages/indexer-custom/.env`**
```env
DATABASE_URL=postgresql://user:pass@prod-db:5432/dashtec
REDIS_URL=redis://prod-redis:6379/0
# ... other collector vars
```

### Deploy

```bash
# 1. Set version and registry
export REGISTRY=registry.example.com
export VERSION=v1.0.0

# 2. Pull latest images
docker compose -f docker-compose.production.yml pull

# 3. Start services
docker compose -f docker-compose.production.yml up -d
```

---

## 4. Deployment: Kubernetes

Use the manifests in `k8s/base` (or use Kustomize/Helm if configured).

### Key Manifests
*   `indexer-custom-deployment.yaml`: Runs all collectors in a single pod.
*   `indexer-ponder-deployment.yaml`: Runs the Ponder indexer.
*   `web-deployment.yaml`: Runs the Next.js web app.
*   `migration-job.yaml`: Runs DB migrations.

### Deploy

```bash
# 1. Update Secrets/ConfigMaps (if changed)
kubectl apply -f k8s/base/secret.yaml
kubectl apply -f k8s/base/configmap.yaml

# 2. Run Migrations
kubectl apply -f k8s/base/migration-job.yaml
# Wait for job completion...

# 3. Apply Deployments
kubectl apply -f k8s/base/indexer-custom-deployment.yaml
kubectl apply -f k8s/base/indexer-ponder-deployment.yaml
kubectl apply -f k8s/base/web-deployment.yaml
```

---

## 5. Monitoring & Maintenance

### Health Checks
All services expose a `/health` endpoint.

*   **Web**: `http://localhost:3000/api/health`
*   **Ponder**: `http://localhost:42069/health`
*   **Collectors**: `http://localhost:4000/health` (Stats), `:4001/health` (List), etc.

### Logs (Docker Compose)
```bash
docker compose -f docker-compose.production.yml logs -f
```

### Logs (Kubernetes)
```bash
kubectl logs -l app=indexer-custom
kubectl logs -l app=web
```
