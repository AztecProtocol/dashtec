terraform {
  required_version = ">= 1.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.48"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }

  backend "s3" {
    bucket = "aztec-dashtec-terraform"
    key    = "dashtec"
    region = "eu-west-2"
  }
}

# Hetzner Cloud hosts the docker-compose stack.
provider "hcloud" {
  token = var.hcloud_token
}

# AWS is used only for the edge layer: CloudFront, its ACM certificate, and the
# Route53 records. State also lives in S3 (see backend above).
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Dashtec"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

# ACM certificates used by CloudFront must live in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "Dashtec"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

locals {
  name_prefix = "aztec-dashtec"

  # Public domains served by CloudFront. The single Hetzner host runs both the
  # mainnet web service (:3000) and the testnet web service (:3001).
  mainnet_domain = var.mainnet_domain
  testnet_domain = var.testnet_domain

  # CloudFront origin: an A record pointing at the Hetzner server's IPv4.
  # CloudFront requires a hostname (not a bare IP) for a custom origin.
  origin_domain = var.origin_domain
}
