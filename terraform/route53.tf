# All Route53 records are skipped when use_custom_domain = false (temporary
# deploys use the CloudFront default domain + sslip.io origin, no DNS needed).

# CloudFront origin: resolves to the Hetzner server's IPv4. Used internally by
# CloudFront, not advertised to users.
resource "aws_route53_record" "origin" {
  count   = var.use_custom_domain ? 1 : 0
  zone_id = var.route53_zone_id
  name    = local.origin_domain
  type    = "A"
  ttl     = 60
  records = [hcloud_server.host.ipv4_address]
}

# A/AAAA alias records pointing each public domain at its CloudFront distribution.
resource "aws_route53_record" "web" {
  for_each = var.use_custom_domain ? local.distributions : {}

  zone_id = var.route53_zone_id
  name    = each.value.domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web[each.key].domain_name
    zone_id                = aws_cloudfront_distribution.web[each.key].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "web_ipv6" {
  for_each = var.use_custom_domain ? local.distributions : {}

  zone_id = var.route53_zone_id
  name    = each.value.domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.web[each.key].domain_name
    zone_id                = aws_cloudfront_distribution.web[each.key].hosted_zone_id
    evaluate_target_health = false
  }
}

# www -> the mainnet distribution, which 301s it to the apex (see the CloudFront
# Function in cloudfront.tf). Separate from aws_route53_record.web because that
# resource is keyed on the distributions map, and www is an extra hostname on an
# existing distribution rather than a distribution of its own.
resource "aws_route53_record" "www" {
  count   = local.www_enabled ? 1 : 0
  zone_id = var.route53_zone_id
  name    = local.www_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web["mainnet"].domain_name
    zone_id                = aws_cloudfront_distribution.web["mainnet"].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_ipv6" {
  count   = local.www_enabled ? 1 : 0
  zone_id = var.route53_zone_id
  name    = local.www_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.web["mainnet"].domain_name
    zone_id                = aws_cloudfront_distribution.web["mainnet"].hosted_zone_id
    evaluate_target_health = false
  }
}
