# Self-hosted Aztec node

dashtec runs its own Aztec node per network instead of pointing at a third-party
RPC. The pattern is lifted from `foundation-iac`'s `aztecscan.xyz/staging` module
(`templates/rpc-compose.yml.tftpl` + `templates/rpc-bootstrap.sh.tftpl`), adapted
to dashtec's existing Terraform + Ansible + docker-compose stack rather than the
AWS launch-template/ASG shape used there.

## Why

`NEXT_SENTINEL_URL` (web) and `VALIDATOR_STATS_RPC_URL` (indexer-custom) used to
be a `sentinel.proxyUrl` secret pointing at someone else's Aztec node. Both only
ever call `node_getValidatorsStats`, which any full node serves. Running our own:

- removes an external dependency the dashboard's validator views depend on;
- makes contract addresses discoverable (`node_getL1ContractAddresses`) instead
  of hand-pinned, which is what makes an Aztec upgrade like V4 → V5 a redeploy
  rather than a manual config edit;
- gives us the full `node_*` surface for future features.

## Where it runs

Same Hetzner host as the rest of the stack, as two docker-compose services:

| Service | Profile | RPC (compose network) | P2P (public) | Memory |
| ------- | ------- | --------------------- | ------------ | ------ |
| `aztec-node-mainnet` | `mainnet` | `http://aztec-node-mainnet:8080` | 40400 TCP+UDP | 8g |
| `aztec-node-testnet` | `testnet` | `http://aztec-node-testnet:8080` | 40500 TCP+UDP | 6g |

The RPC port is deliberately **not** published to the host. Only sibling compose
services reach it, over the compose network (named `dashtec` in
`docker-compose.yml` so `docker run --network dashtec` can join it too).

The P2P ports **are** published, and are opened for the whole internet in
`terraform/hetzner.tf` via the `aztec_node_p2p_ports` variable. The node resolves
its own public IP (`P2P_QUERY_FOR_IP=true`) and advertises `P2P_BROADCAST_PORT`
in its ENR, so the container port, the published host port and the firewall rule
must all be the same number — otherwise peers cannot dial in and the node only
ever gets outbound connections.

State lives in named volumes (`aztec_node_data_*`, `aztec_node_crs_*`), so
`docker compose down` does not force a resync.

That state shares the 100 GB `data_volume_size` with Docker images and both
Postgres/Redis pairs. For reference, aztecscan runs a comparable node per network
on a 40 GiB root volume, so this should hold — Postgres growth is the likelier
pressure than the nodes. Watch `df -h /var/lib/docker` after the first sync; a
full disk takes Postgres down with it. Hetzner volumes resize online (and never
shrink), so raising `data_volume_size` and running `resize2fs` is a live
operation if it comes to that.

## Configuration

Everything comes from `.environment/<network>/config.json`:

- `aztecNode.*` — image tag, `NETWORK`, P2P port, sync mode, sentinel history
  length, heap cap, memory limit.
- `rpc.ethereumUrls` — L1 execution RPC (`ETHEREUM_HOSTS`).
- `rpc.consensusUrls` — L1 **beacon** API (`L1_CONSENSUS_HOST_URLS`). The node
  needs this to fetch the blobs carrying checkpoint data; an execution RPC is not
  a substitute.

Ansible's `config` role renders these into the root `.env` as `AZTEC_NODE_*`
variables, which `docker-compose.yml` interpolates. `config.json` stays the single
source of truth; nothing about the node is hardcoded in the compose file.

`NETWORK=mainnet` / `NETWORK=testnet` makes the node resolve its own bootnodes,
registry address and snapshot URLs from the published network config, so unlike
the aztecscan reference there is no `ALLOW_OVERRIDING_NETWORK_CONFIG` and no
hand-set `AZTEC_SLOT_DURATION` / `AZTEC_EPOCH_DURATION`.

One setting the aztecscan reference does not have: **`SENTINEL_ENABLED=true`**.
Without it the node does not serve `node_getValidatorsStats`, and every validator
view in dashtec is empty.

## Deploy flow

`ansible/site.yml` runs `config` → `aztec_node` → `deploy`:

1. `config` injects secrets into `config.json` and renders the root `.env`, so
   the node services have their `AZTEC_NODE_*` variables.
2. `aztec_node` runs `docker compose up -d --wait aztec-node-<network>` (blocking
   on the compose healthcheck, i.e. `GET /status`), then runs
   `scripts/env/discover-contracts.js` in a throwaway `node:20-alpine` container
   joined to the `dashtec` network.
3. `deploy` runs `env:propagate` — now reading the freshly discovered addresses —
   builds images, starts every other service, and applies DB migrations.

`aztec_node_ready_timeout_seconds` (default 3600) bounds step 2. A first boot
restores a snapshot and then catches up to the chain tip; a restart with a warm
data volume comes back in well under a minute.

## Contract discovery

`scripts/env/discover-contracts.js <network>` writes into `config.json`:

| Field | Source |
| ----- | ------ |
| `contracts.rollupAddress` | `node_getL1ContractAddresses` |
| `contracts.registryAddress` | `node_getL1ContractAddresses` |
| `contracts.governanceAddress` | `node_getL1ContractAddresses` |
| `contracts.governanceProposerAddress` | `node_getL1ContractAddresses` |
| `contracts.gseAddress` | `node_getL1ContractAddresses` |
| `contracts.slashingProposerAddress` | L1 `eth_call`: `Rollup.getSlasher()` → `Slasher.PROPOSER()` |
| `ponder.startBlock` | L1 `eth_getCode` binary search for the rollup's deployment block |

`contracts.stakingRegistryAddress` is **not** discovered — it is not part of the
Aztec core deployment and must be set by hand.

The script has no dependencies (it runs under a bare `node:20-alpine`, same as
`propagate-all.js`), so the two function selectors it needs are hardcoded with
their derivations noted in the source.

## Operating

```bash
# on the host, from /opt/dashtec
docker compose --profile mainnet logs -f aztec-node-mainnet
docker compose --profile mainnet exec aztec-node-mainnet \
  node -e "fetch('http://127.0.0.1:8080/status').then(r=>r.text()).then(console.log)"

# re-discover after an Aztec network upgrade
docker run --rm --network dashtec -v /opt/dashtec:/app -w /app \
  node:20-alpine node scripts/env/discover-contracts.js mainnet
```

### Upgrading the node

Bump `aztecNode.image` in `.environment/<network>/config.json` and redeploy. The
Ansible run re-renders the root `.env`, `docker compose up` pulls the new image,
and `aztec_node` re-discovers addresses — which is what picks up a rollup
redeployed by a network upgrade.

The image is pinned as `aztecprotocol/aztec:<tag>@sha256:<digest>`: the digest is
what actually gets pulled (tags are mutable), and the tag rides along so the
version is readable. `foundation-iac` pins by bare digest for the same reason.

Two things to watch when picking a tag:

- **The tags have no `v` prefix.** The git tag is `v5.2.0`; the image tag is
  `5.2.0`. `aztecprotocol/aztec:v5.2.0` does not exist and the pull will fail.
- **The node version and the deployed protocol version are not the same thing.**
  `aztec-packages`' `docs/network_version_config.json` records which protocol
  version mainnet and testnet are actually running — at the v5.2.0 release that is
  still `v5.0.1`, and there are zero L1 contract changes between the two, so a
  5.2.0 client against v5.0.1 contracts is the intended combination. A node
  upgrade only needs dashtec ABI work when that file moves.

Look up a digest with:

```bash
curl -s https://hub.docker.com/v2/repositories/aztecprotocol/aztec/tags/5.2.0 \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['digest'])"
```

### After a rollup redeployment

An Aztec upgrade deploys a *new* rollup at a *new* address. `env:discover` moves
`ponder.startBlock` to that contract's deployment block, so Ponder indexes the new
rollup from scratch and does not carry the old one's events forward. Historical
data from the previous rollup stays in Postgres but is no longer extended.

## Resource notes

Two nodes on one `cx53` (16 vCPU / 32 GB) alongside 2× Postgres, 2× Redis, 2× web
and the indexers is the tightest part of this setup: the memory limits above
account for 14 GB before anything else starts. If the host comes under pressure,
the first lever is dropping the testnet node (remove `testnet` from
`dashtec_networks` and point testnet's `aztecNode.url` at an external RPC), and
the second is moving the nodes to a dedicated server.
