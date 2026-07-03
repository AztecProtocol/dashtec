# --- AWS (edge layer: CloudFront, ACM, Route53) ---

variable "aws_region" {
  description = "AWS region for the provider used by CloudFront/Route53 (these are global services; region is largely cosmetic). ACM for CloudFront is pinned to us-east-1 separately."
  type        = string
  default     = "eu-west-2"
}

variable "environment" {
  description = "Environment name (e.g., prod, staging)"
  type        = string
  default     = "prod"
}

variable "use_custom_domain" {
  description = "When true, provision ACM + Route53 + CloudFront aliases for the custom domains. When false (temporary/no-DNS testing), CloudFront serves on its default *.cloudfront.net domain with an <ip>.sslip.io origin, and no ACM/Route53 resources are created."
  type        = bool
  default     = true
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for the domains. Required only when use_custom_domain = true."
  type        = string
  default     = ""
}

variable "mainnet_domain" {
  description = "Public domain for the mainnet dashboard (CloudFront -> Hetzner :3000)"
  type        = string
  default     = "dashtec.xyz"
}

variable "testnet_domain" {
  description = "Public domain for the testnet dashboard (CloudFront -> Hetzner :3001)"
  type        = string
  default     = "testnet.dashtec.xyz"
}

variable "origin_domain" {
  description = "Hostname that resolves to the Hetzner server's IPv4 and is used as the CloudFront origin. Not user-facing."
  type        = string
  default     = "origin.dashtec.xyz"
}

# --- Hetzner Cloud (compute) ---

variable "hcloud_token" {
  description = "Hetzner Cloud API token. Prefer setting via TF_VAR_hcloud_token or terraform.tfvars (never commit it)."
  type        = string
  sensitive   = true
}

variable "hcloud_location" {
  description = "Hetzner location (e.g. nbg1/fsn1/hel1 in EU, ash/hil in US, sin in Singapore). The data volume is created in the same location."
  type        = string
  default     = "hel1"
}

variable "server_type" {
  description = "Hetzner server type. cx53 = 16 vCPU / 32 GB (Intel/AMD, x86) gives headroom for the dual mainnet+testnet stack. cx43 (8/16) is fine for a single network. Avoid the cpx (AMD) line â€” it took a 2.4-2.75x price increase on 15 Jun 2026."
  type        = string
  default     = "cx53"
}

variable "server_image" {
  description = "Base OS image for the server"
  type        = string
  default     = "ubuntu-24.04"
}

variable "data_volume_size" {
  description = "Size in GB of the Hetzner volume mounted at /var/lib/docker, so Docker images and the Postgres/Redis named volumes persist across server rebuilds. Minimum 10."
  type        = number
  default     = 100
}

variable "enable_backups" {
  description = "Enable Hetzner's automated daily server backups (adds ~20% to the server price). Recommended for DR."
  type        = bool
  default     = true
}

variable "tailscale_auth_key" {
  description = "Tailscale pre-auth key used to register the server on your tailnet at first boot. Use a reusable, pre-authorized, tagged key (e.g. tag:server). Prefer TF_VAR_tailscale_auth_key over committing it."
  type        = string
  sensitive   = true
}

variable "tailscale_hostname" {
  description = "Hostname the server registers under on the tailnet (use it as `ssh root@<hostname>`)."
  type        = string
  default     = "dashtec-host"
}

variable "ssh_public_key" {
  description = "Optional SSH public key for break-glass access via the Hetzner web console. Primary administration is Tailscale SSH; there is no public SSH port. Leave empty to skip."
  type        = string
  default     = ""
}

# Note: the repository URL, app config, and the docker-compose lifecycle are
# managed by Ansible (see ../ansible), not Terraform/cloud-init.
