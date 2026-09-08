# CloudFront's origin-facing IP ranges, used to lock the web ports down so only
# CloudFront can reach the host. Refreshed at plan time; re-apply to pick up
# changes to AWS's published ranges.
data "aws_ip_ranges" "cloudfront_origin" {
  services = ["cloudfront_origin_facing"]
}

# SSH key (optional). Only created when a public key is supplied.
resource "hcloud_ssh_key" "default" {
  count      = var.ssh_public_key == "" ? 0 : 1
  name       = "${local.name_prefix}-key"
  public_key = var.ssh_public_key
}

resource "hcloud_firewall" "host" {
  name = "${local.name_prefix}-host"

  # Mainnet web (:3000) and testnet web (:3001) reachable only from CloudFront.
  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "3000"
    source_ips  = concat(data.aws_ip_ranges.cloudfront_origin.cidr_blocks, data.aws_ip_ranges.cloudfront_origin.ipv6_cidr_blocks)
    description = "Mainnet web from CloudFront"
  }

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "3001"
    source_ips  = concat(data.aws_ip_ranges.cloudfront_origin.cidr_blocks, data.aws_ip_ranges.cloudfront_origin.ipv6_cidr_blocks)
    description = "Testnet web from CloudFront"
  }

  # Aztec node P2P (libp2p discv5 + gossip), one port per network. The nodes
  # advertise these in their ENR (P2P_QUERY_FOR_IP resolves the public IPv4), so
  # they must be reachable from the whole internet for peers to dial in. Keep in
  # sync with AZTEC_NODE_P2P_PORT_* in docker-compose.yml.
  dynamic "rule" {
    for_each = { for p in var.aztec_node_p2p_ports : p.network => p }

    content {
      direction   = "in"
      protocol    = "tcp"
      port        = rule.value.port
      source_ips  = ["0.0.0.0/0", "::/0"]
      description = "Aztec ${rule.key} node P2P (TCP)"
    }
  }

  dynamic "rule" {
    for_each = { for p in var.aztec_node_p2p_ports : p.network => p }

    content {
      direction   = "in"
      protocol    = "udp"
      port        = rule.value.port
      source_ips  = ["0.0.0.0/0", "::/0"]
      description = "Aztec ${rule.key} node P2P (UDP discv5)"
    }
  }

  # The Aztec node JSON-RPC (:8080) is deliberately NOT published to the host and
  # has no rule here: sibling compose services reach it on the compose network as
  # http://aztec-node-<network>:8080.

  # No public SSH rule: administration is over Tailscale SSH (WireGuard tailnet),
  # which is established by outbound connections and needs no inbound port.
}

# Persistent data volume mounted at /var/lib/docker. Kept independent of the
# server so Postgres/Redis data survives a server rebuild.
resource "hcloud_volume" "data" {
  name     = "${local.name_prefix}-data"
  size     = var.data_volume_size
  location = var.hcloud_location
  format   = "ext4"

  # Guard against accidental destruction of persistent data.
  lifecycle {
    prevent_destroy = true
  }
}

resource "hcloud_server" "host" {
  name        = "${local.name_prefix}-host"
  server_type = var.server_type
  image       = var.server_image
  location    = var.hcloud_location

  ssh_keys     = var.ssh_public_key == "" ? [] : [hcloud_ssh_key.default[0].id]
  firewall_ids = [hcloud_firewall.host.id]
  backups      = var.enable_backups

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  user_data = templatefile("${path.module}/templates/user_data.sh.tftpl", {
    volume_device      = hcloud_volume.data.linux_device
    tailscale_auth_key = var.tailscale_auth_key
    tailscale_hostname = var.tailscale_hostname
  })

  labels = {
    project = "dashtec"
  }

  lifecycle {
    # cloud-init runs once at first boot and is deliberately not idempotent (see
    # templates/user_data.sh.tftpl), so user_data has no effect on a running
    # host — but Hetzner treats a change to it as a replacement. The provider
    # only keeps a hash of it in state, so anyone applying with a different
    # `tailscale_auth_key` (a rotated key, or a value reconstructed for a local
    # terraform.tfvars) would silently destroy and rebuild the server, taking
    # the Postgres/Redis and Aztec-node volumes' attachment with it.
    #
    # Changing the bootstrap script therefore needs a deliberate rebuild — taint
    # the server, or temporarily drop this — rather than riding along on an
    # unrelated apply.
    ignore_changes = [user_data]

    # Seatbelt: the data volume already has prevent_destroy, but the server
    # holding it is what an accidental replacement actually takes down.
    prevent_destroy = true
  }
}

resource "hcloud_volume_attachment" "data" {
  volume_id = hcloud_volume.data.id
  server_id = hcloud_server.host.id
  automount = false
}
