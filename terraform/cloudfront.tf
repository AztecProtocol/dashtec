# Single ACM certificate (in us-east-1 for CloudFront) covering both domains.
# Only created with a custom domain — the default CloudFront domain uses AWS's
# own certificate and needs no ACM/Route53 validation.
resource "aws_acm_certificate" "dashtec" {
  count       = var.use_custom_domain ? 1 : 0
  provider    = aws.us_east_1
  domain_name = local.mainnet_domain
  # Adding a SAN replaces the certificate. create_before_destroy below means the
  # new one is issued and validated before CloudFront is repointed at it, so the
  # live site keeps serving on the old cert throughout.
  subject_alternative_names = compact([
    local.testnet_domain,
    local.www_enabled ? local.www_domain : "",
  ])
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Keyed on the KNOWN domain names (static at plan time) rather than on
# domain_validation_options, whose keys aren't knowable until the new cert is
# applied. The per-domain record values are looked up from the cert (unknown
# values are fine; only unknown *keys* break for_each).
resource "aws_route53_record" "cert_validation" {
  for_each = var.use_custom_domain ? toset(compact([
    local.mainnet_domain,
    local.testnet_domain,
    local.www_enabled ? local.www_domain : "",
  ])) : toset([])

  allow_overwrite = true
  zone_id         = var.route53_zone_id
  ttl             = 60
  name            = one([for dvo in aws_acm_certificate.dashtec[0].domain_validation_options : dvo.resource_record_name if dvo.domain_name == each.value])
  type            = one([for dvo in aws_acm_certificate.dashtec[0].domain_validation_options : dvo.resource_record_type if dvo.domain_name == each.value])
  records         = [one([for dvo in aws_acm_certificate.dashtec[0].domain_validation_options : dvo.resource_record_value if dvo.domain_name == each.value])]
}

resource "aws_acm_certificate_validation" "dashtec" {
  count                   = var.use_custom_domain ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.dashtec[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront fronts the Hetzner host: terminates TLS, redirects HTTP->HTTPS, and
# forwards to the relevant web container port over HTTP.
#
# Origin hostname: with a custom domain it's the Route53 `origin.*` record; for
# temporary/no-DNS deploys it's `<server-ip>.sslip.io`, which resolves straight
# to the Hetzner IP (CloudFront requires a hostname, not a bare IP).
locals {
  origin_host = var.use_custom_domain ? local.origin_domain : "${hcloud_server.host.ipv4_address}.sslip.io"

  distributions = {
    mainnet = {
      domain      = local.mainnet_domain
      origin_port = 3000
      # Served by this distribution, then 301'd to the apex by the CloudFront
      # Function below. A dedicated distribution would need its own origin for
      # requests that never reach one.
      extra_aliases = local.www_enabled ? [local.www_domain] : []
    }
    testnet = {
      domain        = local.testnet_domain
      origin_port   = 3001
      extra_aliases = []
    }
  }
}

resource "aws_cloudfront_distribution" "web" {
  for_each = local.distributions

  enabled         = true
  aliases         = var.use_custom_domain ? concat([each.value.domain], each.value.extra_aliases) : []
  is_ipv6_enabled = true
  comment         = "dashtec ${each.key} dashboard"

  origin {
    domain_name = local.origin_host
    origin_id   = "hetzner-${each.key}"

    custom_origin_config {
      http_port              = each.value.origin_port
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "hetzner-${each.key}"
    viewer_protocol_policy = "redirect-to-https"

    # The dashboard is a dynamic Next.js app (API routes, cookies/sessions),
    # so forward everything and effectively bypass the cache by default. Tune
    # per-path with ordered_cache_behavior if you want to cache static assets.
    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0

    # Only the mainnet distribution carries the www alias, so only it needs the
    # redirect. The function passes every non-www host straight through.
    dynamic "function_association" {
      for_each = each.key == "mainnet" && local.www_enabled ? [1] : []

      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.www_redirect[0].arn
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.use_custom_domain ? null : true
    acm_certificate_arn            = one(aws_acm_certificate_validation.dashtec[*].certificate_arn)
    ssl_support_method             = var.use_custom_domain ? "sni-only" : null
    minimum_protocol_version       = var.use_custom_domain ? "TLSv1.2_2021" : null
  }
}

# 301s www -> apex at the edge, before the request reaches Hetzner. Cheaper and
# lower-latency than an origin-side redirect, and it keeps the app unaware of
# which hostname it was reached on.
resource "aws_cloudfront_function" "www_redirect" {
  count = local.www_enabled ? 1 : 0

  name    = "${local.name_prefix}-www-redirect"
  runtime = "cloudfront-js-2.0"
  comment = "301 ${local.www_domain} -> ${local.mainnet_domain}, preserving path and query"
  publish = true

  code = templatefile("${path.module}/templates/www-redirect.js.tftpl", {
    www_domain  = local.www_domain
    apex_domain = local.mainnet_domain
  })
}
