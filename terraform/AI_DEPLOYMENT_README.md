# AI Configuration for Production Deployment

## Problem Resolution

The error "All AI providers failed: groq: xAI API key not configured; ollama: Ollama service not available" occurs because the production environment was missing AI environment variables.

## Solution

The Terraform configuration has been updated to include all necessary AI environment variables.

## Setup Instructions

### 1. Configure AI Variables

Copy the example terraform variables file:
```bash
cp terraform.tfvars.example terraform.tfvars
```

### 2. Update terraform.tfvars

Edit `terraform.tfvars` and provide your actual API keys:

```hcl
# Required: Primary AI provider
ai_provider = "xai"
xai_api_key = "xai-e8c9TRlFZElDdwN2hGfr6SPPAaYf81Y5dpP7v6NPYiSGfZT41n2nlGyZ8zPX96Zqh0C9qVt4ogY8DePP"
xai_model = "grok-2-latest"

# Optional: Alternative providers for fallback
# anthropic_api_key = "sk-ant-your-key-here"
# groq_api_key = "gsk_your-key-here"
```

### 3. Deploy with Terraform

```bash
cd terraform
terraform plan
terraform apply
```

## AI Provider Options

### Primary (Cheapest/Fastest)
- **xAI (Grok)**: Fast and cost-effective
  - Model: `grok-2-latest`
  - Cost: ~$0.0005 per recipe parsing

### Fallback Options
- **Anthropic Claude**: High quality, reasonable cost
  - Model: `claude-3-haiku-20240307`
  - Cost: ~$0.0004 per recipe parsing

- **Groq**: Fastest inference (free tier available)
  - Model: `llama3-8b-8192`

### Local Fallback
- **Ollama**: Free local inference (disabled in production)

## Environment Variables Added

The following environment variables are now included in the production deployment:

```bash
AI_PROVIDER=xai
AI_TIMEOUT=15000
XAI_API_KEY=your-xai-key
XAI_MODEL=grok-2-latest
ANTHROPIC_API_KEY=your-anthropic-key
ANTHROPIC_MODEL=claude-3-haiku-20240307
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama3-8b-8192
TOGETHER_API_KEY=your-together-key
TOGETHER_MODEL=meta-llama/Llama-2-7b-chat-hf
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-3.5-turbo
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
```

## Verification

After deployment, the AI recipe parsing should work. You can verify by:

1. Checking the server logs for AI configuration
2. Testing the recipe parsing functionality in the app
3. Using the debug endpoint: `/api/recipes/ai-config`

## Security Notes

- All API keys are marked as `sensitive = true` in Terraform
- API keys are not logged in plain text (masked in logs)
- Use proper IAM roles and least-privilege access
- Store terraform.tfvars securely and don't commit it to version control