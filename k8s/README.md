# Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the Dashtec monorepo services.

## Architecture

### Services

1. **Web Application** (`apps/web`)
   - Next.js frontend
   - 2 replicas for high availability
   - Port: 3000

2. **Ponder Indexer** (`packages/indexer-ponder`)
   - Event-based blockchain indexer
   - 1 replica (stateful indexing)
   - Port: 42069

3. **Custom Collectors** (`packages/indexer-custom`)
   - 5 independent deployments, each running a specific collector:
     - `collector-validator-stats` (port 4000)
     - `collector-validator-list` (port 4001)
     - `collector-epoch-integrity` (port 4002)
     - `collector-validator-migration` (port 4003)
     - `collector-provider-list` (port 4004)

## Directory Structure

```
k8s/
├── base/                    # Base Kubernetes manifests
│   ├── web-deployment.yaml
│   ├── indexer-ponder-deployment.yaml
│   ├── collector-*.yaml     # 5 collector deployments
│   ├── configmap.yaml
│   └── secret.yaml          # Template (don't commit actual secrets)
├── overlays/
│   ├── staging/            # Staging-specific overrides
│   └── production/         # Production-specific overrides
└── README.md
```

## Prerequisites

1. **Kubernetes cluster** (v1.24+)
2. **kubectl** configured
3. **Docker images** built and pushed to registry
4. **PostgreSQL database** accessible from cluster
5. **Redis** (optional, for caching)

## Building Docker Images

From the monorepo root:

```bash
# Build web app
docker build -f apps/web/Dockerfile -t your-registry/dashtec-web:latest .

# Build Ponder indexer
docker build -f packages/indexer-ponder/Dockerfile -t your-registry/dashtec-indexer-ponder:latest .

# Build custom collectors
docker build -f packages/indexer-custom/Dockerfile -t your-registry/dashtec-indexer-custom:latest .

# Push images
docker push your-registry/dashtec-web:latest
docker push your-registry/dashtec-indexer-ponder:latest
docker push your-registry/dashtec-indexer-custom:latest
```

## Configuration

### 1. Update ConfigMap

Edit `k8s/base/configmap.yaml` with your configuration:

```yaml
data:
  NETWORK_TYPE: "mainnet"
  ROLLUP_CONTRACT_ADDRESS: "0x..."
  TALLY_SLASHING_PROPOSER_CONTRACT_ADDRESS: "0x..."
  # ... other contract addresses
  RPC_URLS: "https://rpc1.example.com,https://rpc2.example.com"
  START_BLOCK: "12345678"
```

### 2. Create Secrets

**Option A: Using kubectl**

```bash
kubectl create secret generic dashtec-secrets \
  --from-literal=database-url='postgresql://user:password@host:port/database' \
  --from-literal=redis-url='redis://host:port/0'
```

**Option B: Using a secret management tool**

Use tools like:
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [External Secrets Operator](https://external-secrets.io/)
- [Vault](https://www.vaultproject.io/)

### 3. Update Image References

Update the `image:` fields in deployment files to point to your registry:

```yaml
containers:
- name: web
  image: your-registry/dashtec-web:v1.0.0  # Update this
```

## Deployment

### Deploy All Services

```bash
# Create namespace (optional)
kubectl create namespace dashtec

# Apply configurations
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secret.yaml

# Deploy services
kubectl apply -f k8s/base/web-deployment.yaml
kubectl apply -f k8s/base/indexer-ponder-deployment.yaml
kubectl apply -f k8s/base/collector-validator-stats.yaml
kubectl apply -f k8s/base/collector-validator-list.yaml
kubectl apply -f k8s/base/collector-epoch-integrity.yaml
kubectl apply -f k8s/base/collector-validator-migration.yaml
kubectl apply -f k8s/base/collector-provider-list.yaml
```

### Deploy Individual Services

```bash
# Deploy only web app
kubectl apply -f k8s/base/web-deployment.yaml

# Deploy only a specific collector
kubectl apply -f k8s/base/collector-validator-stats.yaml
```

## Database Migrations

Before deploying, run Prisma migrations:

```bash
# From your local machine or a migration job
pnpm db:migrate
```

## Monitoring

### Check Deployment Status

```bash
kubectl get deployments
kubectl get pods
kubectl get services
```

### View Logs

```bash
# Web app
kubectl logs -l app=web -f

# Ponder indexer
kubectl logs -l app=indexer-ponder -f

# Specific collector
kubectl logs -l app=collector-validator-stats -f
```

### Health Checks

All services expose health endpoints:

```bash
# Port-forward to check health
kubectl port-forward svc/web 3000:80
curl http://localhost:3000/api/health

kubectl port-forward svc/indexer-ponder 42069:42069
curl http://localhost:42069/health

kubectl port-forward svc/collector-validator-stats 4000:4000
curl http://localhost:4000/health
```

## Scaling

### Scale Web App

```bash
kubectl scale deployment web --replicas=5
```

### Scale Individual Collectors

```bash
kubectl scale deployment collector-validator-stats --replicas=2
```

**Note:** Most collectors should run with 1 replica as they perform stateful operations. Only scale if you've implemented proper leader election or idempotency.

## Ingress (Optional)

To expose the web app externally, create an Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashtec-ingress
spec:
  rules:
  - host: dashtec.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Database Connection Issues

1. Check secret is created: `kubectl get secret dashtec-secrets`
2. Verify DATABASE_URL is correct
3. Ensure database is accessible from cluster (firewall, network policies)

### Image Pull Errors

1. Verify images are pushed to registry
2. Check registry credentials: `kubectl create secret docker-registry ...`
3. Add `imagePullSecrets` to deployment

## Cleanup

```bash
# Delete all resources
kubectl delete -f k8s/base/

# Delete namespace (if created)
kubectl delete namespace dashtec
```

## Production Recommendations

1. **Use Kustomize or Helm** for environment-specific configurations
2. **Set resource requests/limits** based on actual usage
3. **Enable horizontal pod autoscaling** for web app
4. **Use persistent volumes** for Ponder indexer cache
5. **Implement proper logging** (ELK, Loki, etc.)
6. **Set up monitoring** (Prometheus, Grafana)
7. **Use pod disruption budgets** for high availability
8. **Implement network policies** for security
9. **Use node affinity** to isolate heavy workloads
10. **Regular backups** of database
