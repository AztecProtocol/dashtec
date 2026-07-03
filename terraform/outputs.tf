output "server_ipv4" {
  description = "Hetzner server public IPv4 (CloudFront origin)"
  value       = hcloud_server.host.ipv4_address
}

output "server_ipv6" {
  description = "Hetzner server public IPv6"
  value       = hcloud_server.host.ipv6_address
}

output "ssh_command" {
  description = "Administer the host over Tailscale SSH (you must be on the same tailnet)"
  value       = "ssh root@${var.tailscale_hostname}"
}

output "origin_host" {
  description = "CloudFront origin hostname (Route53 origin.* record, or <ip>.sslip.io when use_custom_domain = false)"
  value       = local.origin_host
}

output "mainnet_url" {
  description = "Mainnet dashboard URL (custom domain, or the CloudFront default domain when use_custom_domain = false)"
  value       = var.use_custom_domain ? "https://${local.mainnet_domain}" : "https://${aws_cloudfront_distribution.web["mainnet"].domain_name}"
}

output "testnet_url" {
  description = "Testnet dashboard URL (custom domain, or the CloudFront default domain when use_custom_domain = false)"
  value       = var.use_custom_domain ? "https://${local.testnet_domain}" : "https://${aws_cloudfront_distribution.web["testnet"].domain_name}"
}

output "cloudfront_domains" {
  description = "CloudFront distribution domain names"
  value = {
    for k, dist in aws_cloudfront_distribution.web : k => dist.domain_name
  }
}
