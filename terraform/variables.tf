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
  default     = "RecipeAppUsers"
}

variable "recipes_table_name" {
  description = "Name for the DynamoDB Recipes table."
  type        = string
  default     = "RecipeAppRecipes"
}

variable "recipe_collections_table_name" {
  description = "Name for the DynamoDB Recipe Collections table."
  type        = string
  default     = "RecipeAppRecipeCollections"
}

variable "meal_plans_table_name" {
  description = "Name for the DynamoDB Meal Plans table."
  type        = string
  default     = "RecipeAppMealPlans"
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
  default     = "arn:aws:acm:us-east-1:872450838091:certificate/f8223c19-4279-4ce4-925a-47117fd03c0e"
}

# AI Configuration Variables
variable "ai_provider" {
  description = "The AI provider to use (xai, anthropic, groq, together, openai, ollama)"
  type        = string
  default     = "xai"
}

variable "ai_timeout" {
  description = "Timeout for AI API requests in milliseconds"
  type        = number
  default     = 15000
}

variable "xai_api_key" {
  description = "xAI API key for Grok models"
  type        = string
  default     = "xai-e8c9TRlFZElDdwN2hGfr6SPPAaYf81Y5dpP7v6NPYiSGfZT41n2nlGyZ8zPX96Zqh0C9qVt4ogY8DePP"
  sensitive   = true
}

variable "xai_model" {
  description = "xAI model to use"
  type        = string
  default     = "grok-2-latest"
}

variable "anthropic_api_key" {
  description = "Anthropic API key for Claude models"
  type        = string
  default     = ""
  sensitive   = true
}

variable "anthropic_model" {
  description = "Anthropic model to use"
  type        = string
  default     = "claude-3-haiku-20240307"
}

variable "groq_api_key" {
  description = "Groq API key for fast inference"
  type        = string
  default     = ""
  sensitive   = true
}

variable "groq_model" {
  description = "Groq model to use"
  type        = string
  default     = "llama3-8b-8192"
}

variable "together_api_key" {
  description = "Together AI API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "together_model" {
  description = "Together AI model to use"
  type        = string
  default     = "meta-llama/Llama-2-7b-chat-hf"
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openai_model" {
  description = "OpenAI model to use"
  type        = string
  default     = "gpt-3.5-turbo"
}

variable "ollama_endpoint" {
  description = "Ollama endpoint URL for local inference"
  type        = string
  default     = "http://localhost:11434"
}

variable "ollama_model" {
  description = "Ollama model to use"
  type        = string
  default     = "llama3.2:1b"
}
