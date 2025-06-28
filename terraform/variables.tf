variable "aws_region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "A name for the project, used for tagging and naming resources."
  type        = string
  default     = "goodfood"
}

variable "vpc_cidr_block" {
  description = "The CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr_blocks" {
  description = "A list of CIDR blocks for public subnets."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "ec2_instance_type" {
  description = "The EC2 instance type."
  type        = string
  default     = "t2.micro"
}

variable "min_size_asg" {
  description = "Minimum number of instances in the Auto Scaling Group."
  type        = number
  default     = 1
}

variable "max_size_asg" {
  description = "Maximum number of instances in the Auto Scaling Group."
  type        = number
  default     = 2
}

variable "desired_capacity_asg" {
  description = "Desired number of instances in the Auto Scaling Group."
  type        = number
  default     = 1
}

variable "users_table_name" {
  description = "Name for the DynamoDB Users table."
  type        = string
  default     = "goodfood_users"
}

variable "recipes_table_name" {
  description = "Name for the DynamoDB Recipes table."
  type        = string
  default     = "goodfood_recipes"
}

variable "recipe_collections_table_name" {
  description = "Name for the DynamoDB Recipe Collections table."
  type        = string
  default     = "goodfood_recipe_collections"
}

variable "meal_plans_table_name" {
  description = "Name for the DynamoDB Meal Plans table."
  type        = string
  default     = "goodfood_meal_plans"
}

variable "jwt_secret" {
  description = "The JWT secret for the application. IMPORTANT: Change this for production and consider using AWS Secrets Manager."
  type        = string
  default     = "YourSuperSecretJWTTokenPlaceholder123!"
  sensitive   = true
}

variable "dockerhub_username" {
  description = "Your Docker Hub username."
  type        = string
  default     = "inventvenkat"
}

variable "app_server_port" {
  description = "The port the backend application server listens on within its container."
  type        = number
  default     = 3001
}

variable "app_client_port_nginx" {
  description = "The port Nginx listens on within the client container."
  type        = number
  default     = 80
}

variable "docker_compose_version" {
  description = "The version of Docker Compose to install on EC2 instances."
  type        = string
  default     = "v2.20.2" # Matches the version in user_data.sh.tpl
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate for the domain."
  type        = string
  default     = "arn:aws:acm:us-east-1:872450838091:certificate/6b0c769b-720c-445f-b209-74c1bd023c0d"
}
