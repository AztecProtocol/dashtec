# Dashtec Configuration & Deploy (Ansible)

Configures the Hetzner host provisioned by [`../terraform`](../terraform) and
deploys the docker-compose stack. **Terraform provisions; Ansible configures.**

Deploys normally run from **GitHub Actions** (see
[`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)); secrets
come from **GitHub Actions Secrets** (no Ansible Vault). You can also run the
playbook locally by exporting the same variables.

cloud-init only bootstraps the box (mounts the data volume, installs Python +
Tailscale, hardens sshd). Everything else — Docker, the repo, app config, and
the docker-compose lifecycle — lives here, so it's idempotent and re-runnable.

## What it does (`site.yml`)

| Role     | Action |
| -------- | ------ |
| `docker` | Install Docker Engine + compose plugin + git + jq (GPG-pinned apt repo) |
| `repo`   | Clone/update the repo at `repo_version` into `/opt/dashtec` (`force: true`, resetting the committed `config.json` to its clean, secret-free state) |
| `config` | Assert secrets present, inject secrets into the committed `config.json` (via jq), read it back, render the root `.env` |
| `aztec_node` | Start `aztec-node-<network>` and wait for it to report healthy, then discover the Aztec V5 contract addresses and the rollup's deployment block from it into `config.json` |
| `deploy` | Run `env:propagate` (Node-only, via an ephemeral container), then `docker compose --profile <network> up -d --build` for each network, then apply DB migrations |

### Config & secrets model

`.environment/<network>/config.json` is **committed** with all non-secret values
(addresses, domains, in-cluster DB/Redis URLs, collector tuning) and **empty**
secret fields. At deploy, the `config` role injects the secrets with `jq`, then
the `aztec_node` role starts our own Aztec node and discovers the V5 contract
addresses from it, and only then does `env:propagate` fan everything into the
package `.env` files. The root `.env`'s `NEXT_SENTINEL_URL` /
`VALIDATOR_STATS_RPC_URL` (+ testnet) point at that node
(`http://aztec-node-<network>:8080`), and its `AZTEC_NODE_*` variables are what
the node services in `docker-compose.yml` interpolate. Never commit real secret
values into `config.json`.

Role order matters: `config` renders the root `.env` (so the node can start),
`aztec_node` brings the node up and writes `contracts.*` + `ponder.startBlock`
into `config.json`, `deploy` propagates and starts everything else.

## CI deployment (default)

Push to `main` (or run the workflow manually) triggers the deploy. The runner:
1. joins your tailnet via the Tailscale action, then
2. runs Ansible against the host over Tailscale SSH, with secrets injected as env vars.

### Required GitHub Actions configuration

**Secrets** (Settings → Secrets and variables → Actions, ideally on a
`production` environment):

| Secret | Purpose |
| ------ | ------- |
| `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET` | Tailscale OAuth client (tagged `tag:ci`) so the runner joins the tailnet |
| `MAINNET_ETHEREUM_RPC_URL`, `TESTNET_ETHEREUM_RPC_URL` | L1 RPC URLs (contain API keys) → `rpc.ethereumUrls` |
| `MAINNET_L1_CONSENSUS_HOST_URLS`, `TESTNET_L1_CONSENSUS_HOST_URLS` | L1 beacon-chain API URLs → `rpc.consensusUrls`. Only the Aztec node uses these, to fetch the blobs carrying checkpoint data; an execution RPC will not do |
| `MAINNET_SESSION_PASSWORD`, `TESTNET_SESSION_PASSWORD` | iron-session password (≥32 chars) |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret — **shared across networks** (optional) |
| `X_CLIENT_SECRET` | X OAuth secret — **shared across networks** (optional) |

> `ETHEREUM_RPC_URL`, `L1_CONSENSUS_HOST_URLS`, and `SESSION_PASSWORD` are required
> per active network; the OAuth secrets are shared and optional (auth is disabled
> if empty). Register both `dashtec.xyz` and `testnet.dashtec.xyz` redirect URIs
> on the single Discord/X app, and set the matching `clientId` in each network's
> committed `config.json`.

**Variables** (Settings → Secrets and variables → Actions → Variables; non-secret):

| Variable | Purpose |
| -------- | ------- |
| `DEPLOY_HOST` | Tailnet hostname of the server (defaults to `dashtec-host`) |
| `DISCORD_CLIENT_ID` | Discord OAuth client ID — shared across networks (optional) |
| `X_CLIENT_ID` | X OAuth client ID — shared across networks (optional) |

The OAuth client IDs are public, so they're variables rather than secrets; pair
each with its corresponding `*_CLIENT_SECRET`.

### Tailnet prerequisites

- A Tailscale **OAuth client** with the `tag:ci` tag (admin console → Settings → OAuth clients).
- An ACL **SSH rule** allowing `tag:ci` to SSH to the server's tag as `root` with
  `action: accept` (not `check`, which requires interactivity):
  ```jsonc
  "ssh": [{ "action": "accept", "src": ["tag:ci"], "dst": ["tag:server"], "users": ["root"] }]
  ```
- **MagicDNS** enabled so `DEPLOY_HOST` resolves on the runner (or set
  `DEPLOY_HOST` to the tailscale IP).

## Running locally

```bash
cd ansible
# inventory.ini is generated by `terraform apply`; or copy inventory.example.ini
export MAINNET_ETHEREUM_RPC_URL=... MAINNET_L1_CONSENSUS_HOST_URLS=... MAINNET_SESSION_PASSWORD=...
export TESTNET_ETHEREUM_RPC_URL=... TESTNET_L1_CONSENSUS_HOST_URLS=... TESTNET_SESSION_PASSWORD=...
# optional: *_DISCORD_CLIENT_SECRET / *_X_CLIENT_SECRET
ansible-playbook site.yml
```

Your machine must be on the tailnet with an ACL permitting SSH to the host.

## Notes

- The committed `config.json` carries non-secret values; the `config` role injects
  secrets into it with `jq` (read via env, never on the command line), then
  `env:propagate` generates the package `.env` files. Because `config.json` is
  tracked, the `repo` role uses `force: true` so each deploy resets it to the
  clean committed state before re-injecting.
- The root `.env` is rendered because docker-compose's `environment:` blocks
  override `env_file:` for those vars — see `roles/config`. The role fails fast
  if a required secret is missing.
- No extra Ansible collections are required (only `ansible.builtin`).
