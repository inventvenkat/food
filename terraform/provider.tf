terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.60.0" # Pin to a specific, slightly older version
    }
  }

  required_version = "~> 1.3" # Adjusted for compatibility with Terraform v1.3.x
}

provider "aws" {
  region = var.aws_region
}
