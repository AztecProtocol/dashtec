# Dashtec Infrastructure (Terraform)

Provisions a **Hetzner Cloud** server that runs the project's `docker-compose.yml`
(web, indexers, materializer, plus containerized Postgres and Redis for
**mainnet** and **testnet**), with **AWS CloudFront** in front for TLS and custom
domains. Terraform state lives in S3.

## Architecture

```
        Route53 (AWS)
        ├─ dashtec.xyz                (A/AAAA alias) ─┐
        ├─ testnet.dashtec.xyz        (A/AAAA alias) ─┤
        │                                             ▼
        │                                      CloudFront + ACM (AWS)
        │                                             │ http-only origin
        └─ origin.dashtec.xyz (A → Hetzner IP)        │
                                                          ▼
                                       Hetzner server  :3000 (mainnet web)
                                                       :3001 (testnet web)
                                                          │
                                          docker compose on one host
                                          ├─ web / web-testnet
                                          ├─ indexer-ponder(-testnet)
                                          ├─ indexer-custom(-testnet)
                                          ├─ materializer(-testnet)
                                          ├─ postgres-mainnet / -testnet  (volume-backed)
                                          └─ redis-mainnet / -testnet      (volume-backed)
```

- **Compute (Hetzner):** one `hcloud_server` (Ubuntu 24.04). cloud-init only
  bootstraps the box (mounts the volume, installs Python + Tailscale, hardens
  sshd); Docker, the repo, app config, and the compose lifecycle are handled by
  **Ansible** (see [`../ansible`](../ansible)). Optional daily backups.
- **Data:** a dedicated Hetzner volume mounted at `/var/lib/docker`, so images
  and the Postgres/Redis named volumes survive a server rebuild. It has
  `prevent_destroy = true`.
- **Edge (AWS):** CloudFront terminates TLS (ACM cert covering both domains),
  redirects HTTP→HTTPS, and forwards to the host's web ports over HTTP.
- **Lockdown:** the Hetzner firewall only allows ports 3000/3001 from
  **CloudFront's origin-facing IP ranges** (pulled live via the `aws_ip_ranges`
  data source). Postgres/Redis are never exposed.
- **Access:** **Tailscale SSH** over the WireGuard tailnet — there is **no public
  SSH port**. cloud-init joins the tailnet with a pre-auth key and runs
  `tailscale up --ssh`; OS password/root-password auth is disabled as
  defense-in-depth. An optional `ssh_public_key` is available only for Hetzner
  web-console break-glass.

## Files

| File             | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `main.tf`        | Terraform settings, S3 backend, hcloud + AWS providers |
| `variables.tf`   | Input variables                                        |
| `hetzner.tf`     | Firewall, data volume, server (Tailscale SSH), attachment |
| `cloudfront.tf`  | ACM cert + DNS validation + CloudFront distributions   |
| `route53.tf`     | Origin A record + public A/AAAA alias records          |
| `ansible.tf`     | Generates `../ansible/inventory.ini` from the tailnet host |
| `outputs.tf`     | Server IPs, SSH command, URLs                          |
| `templates/`     | `user_data.sh.tftpl` minimal cloud-init bootstrap      |

## Prerequisites

1. **Hetzner Cloud API token** — console → Project → Security → API Tokens
   (read/write). Export as `TF_VAR_hcloud_token` or set in `terraform.tfvars`.
2. **AWS credentials** with access to CloudFront, ACM, Route53, and the S3 state
   bucket (default `aztec-dashtec-terraform` — create it once or edit the
   `backend "s3"` block in `main.tf`).
3. A **Route53 hosted zone** for the domain — set `route53_zone_id`. **Only needed
   when `use_custom_domain = true`**; for temporary/no-DNS testing leave it empty.
4. A **Tailscale pre-auth key** (`tailscale_auth_key`) — admin console → Settings
   → Keys. Make it reusable, pre-authorized, and tagged (e.g. `tag:server`).
   Ensure your tailnet ACL grants SSH to that tag for your admin users.

## Usage

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # then edit values

terraform init
terraform plan
terraform apply
```

ACM DNS validation and CloudFront propagation can take 10–30 minutes on first
apply. The origin A record is created automatically from the server's IPv4.

### Temporary / no-DNS deploys (`use_custom_domain = false`)

Without a delegated Route53 zone, set `use_custom_domain = false`. Terraform then
skips all ACM and Route53 resources and CloudFront serves on its default
`https://<id>.cloudfront.net` domain, with the origin set to `<server-ip>.sslip.io`
(resolves straight to the Hetzner IP). `terraform output mainnet_url` / `testnet_url`
print the CloudFront URLs to test on. Flip to `true` and set the domains once a
zone is delegated — that's the go-live step. (You can also smoke-test the app
directly over Tailscale at `http://dashtec-host:3000` without CloudFront at all.)

## Bringing the stack up

cloud-init leaves a bootstrapped, Tailscale-joined host. Configuration and
deployment are handled by Ansible, normally run from **GitHub Actions** — a push
to `main` deploys via the runner joining the tailnet and running the playbook
with secrets from GitHub Actions Secrets. See
[`../ansible/README.md`](../ansible) and
[`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

For a local/manual deploy, `terraform apply` already wrote
`../ansible/inventory.ini` from the tailnet hostname; export the secret env vars
and run `ansible-playbook site.yml` from a machine on the tailnet.

Re-runs are idempotent (day-2 updates: new `repo_version`, config changes,
restarts). Because Docker data lives on the persistent Hetzner volume, rebuilding
the server keeps your database and Redis data intact — reattach the volume and
re-deploy.

## Cost (approximate, EU; verify in your Hetzner console)

| Item                          | Est. monthly        |
| ----------------------------- | ------------------- |
| `cx53` server (16 vCPU/32 GB) | ~€22.49             |
| Primary IPv4                  | ~€0.50              |
| 100 GB volume                 | ~€4.80              |
| Daily backups (+20%)          | ~€4.50              |
| CloudFront (light traffic)    | ~$0–5               |
| ACM / Route53 / state         | ~free               |
| **Total**                     | **~€32 / ~$34 / mo**|

Each Hetzner server includes 20 TB/mo egress, so origin→CloudFront transfer is
effectively free. `cx43` (8 vCPU/16 GB, ~€12/mo) suffices for a single network.
Avoid the `cpx` (AMD) line — its 15 Jun 2026 price increase makes it ~€121/mo for
comparable specs, on par with AWS. The `cx` (Intel) line stayed cheap and keeps
you on x86.

## Notes & trade-offs

- **Single host:** no horizontal scaling or failover, matching the docker-compose
  workflow. Indexers/materializer are single-writer and must not be duplicated.
- **No managed DB:** Postgres/Redis are containers — Hetzner has no RDS/ElastiCache
  equivalent. Enable backups and/or run `pg_dump` on a schedule; you own durability.
- **CloudFront IP ranges drift:** the firewall is populated from `aws_ip_ranges` at
  plan time. Re-apply periodically to track changes to AWS's published ranges.
- **Caching:** CloudFront forwards everything with TTL 0 (the dashboard is dynamic).
  Add `ordered_cache_behavior` blocks to cache `/_next/static/*` if desired.
- **Server rebuild changes the IP:** Terraform updates the origin A record
  automatically; CloudFront picks it up after DNS TTL (60s).
