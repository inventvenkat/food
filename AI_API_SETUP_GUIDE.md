# AI API Setup Guide for Recipe Parsing

This guide explains how to configure the recipe management application to use online AI APIs for recipe parsing instead of running local models.

## Supported AI Providers

The application supports multiple AI providers with automatic fallback:

1. **OpenAI** (Recommended) - GPT-3.5-turbo or GPT-4
2. **Anthropic** - Claude models
3. **Ollama** - Local models (fallback)

## Configuration Options

### Option 1: OpenAI (Recommended)

**Why OpenAI?**
- Fast response times (1-2 seconds)
- Excellent structured output for JSON
- Cost-effective for recipe parsing (~$0.001 per recipe)
- High reliability and uptime

**Setup Steps:**

1. **Get OpenAI API Key**
   - Visit https://platform.openai.com/api-keys
   - Create account or sign in
   - Click "Create new secret key"
   - Copy the API key (starts with `sk-...`)

2. **Configure Environment Variables**
   ```bash
   # In server/.env
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-your-actual-api-key-here
   OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4 for better accuracy
   ```

3. **Cost Estimation**
   - GPT-3.5-turbo: ~$0.001 per recipe parse
   - GPT-4: ~$0.01 per recipe parse
   - 1000 recipes ≈ $1-10 depending on model

### Option 2: Anthropic Claude

**Why Anthropic?**
- High-quality structured output
- Good for complex recipe parsing
- Alternative to OpenAI

**Setup Steps:**

1. **Get Anthropic API Key**
   - Visit https://console.anthropic.com/
   - Create account and add billing
   - Go to API Keys section
   - Create new API key

2. **Configure Environment Variables**
   ```bash
   # In server/.env
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here
   ANTHROPIC_MODEL=claude-3-haiku-20240307  # Fast and cost-effective
   # ANTHROPIC_MODEL=claude-3-sonnet-20240229  # Higher quality
   ```

### Option 3: Ollama (Local Fallback)

**Why keep Ollama?**
- Automatic fallback if online APIs fail
- No per-request costs
- Privacy - data stays local

**Setup:**
- Follow the existing `OLLAMA_SETUP_GUIDE.md`
- Ollama will be used automatically as fallback

## Environment Configuration

### Complete .env Example

```bash
# AI Configuration
AI_PROVIDER=openai  # or 'anthropic' or 'ollama'
AI_TIMEOUT=30000

# OpenAI Configuration (Primary - recommended)
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Anthropic Configuration (Alternative)
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
# ANTHROPIC_MODEL=claude-3-haiku-20240307

# Ollama Configuration (Local fallback)
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

### Security Best Practices

1. **Never commit API keys to git**
   - API keys are in `.env` which is git-ignored
   - Use different keys for development/production

2. **Restrict API key permissions**
   - OpenAI: Limit to specific projects if available
   - Anthropic: Use minimum required permissions

3. **Monitor usage and costs**
   - Set up billing alerts
   - Monitor API usage regularly

## Installation and Testing

### 1. Install Dependencies

```bash
cd server
npm install  # This will install the new 'openai' package
```

### 2. Configure API Key

Update `server/.env` with your chosen provider's API key.

### 3. Test the Integration

```bash
# Start the application
docker-compose up

# Test in browser
# 1. Go to http://localhost:3003
# 2. Navigate to "Create Recipe"
# 3. Paste any recipe text
# 4. Click "Parse Recipe with AI"
# 5. Check browser network tab for API calls
```

## Fallback Chain

The application uses this fallback strategy:

1. **Primary AI Provider** (OpenAI/Anthropic) - Fast, reliable
2. **Ollama** (if available) - Local backup
3. **Rule-based Parser** - Always available

Example flow:
```
Recipe Text → OpenAI API → Success ✅
Recipe Text → OpenAI API → Fails → Ollama → Success ✅  
Recipe Text → OpenAI API → Fails → Ollama → Fails → Rule-based Parser ✅
```

## Troubleshooting

### OpenAI Issues

**Error: "OpenAI API key not configured"**
- Check `OPENAI_API_KEY` is set in `.env`
- Ensure key starts with `sk-`

**Error: "OpenAI API quota exceeded"**
- Check billing at https://platform.openai.com/account/billing
- Add payment method or increase usage limits

**Error: "OpenAI rate limit exceeded"**
- Wait a few minutes and try again
- Consider upgrading to higher tier for more requests

### Anthropic Issues

**Error: "Invalid Anthropic API key"**
- Verify key starts with `sk-ant-`
- Check key is active in Anthropic console

**Error: "Anthropic rate limit exceeded"**
- Wait and retry
- Check usage limits in Anthropic console

### General Issues

**Error: "All AI providers failed"**
- Check internet connection
- Verify API keys are correct
- Ensure Ollama is running if used as fallback
- Check server logs for detailed error messages

## Cost Management

### OpenAI Costs
- **GPT-3.5-turbo**: $0.0010 / 1K tokens (input), $0.0020 / 1K tokens (output)
- **Average recipe**: ~500 input tokens, ~300 output tokens
- **Cost per recipe**: ~$0.0011
- **1000 recipes**: ~$1.10

### Anthropic Costs
- **Claude 3 Haiku**: $0.00025 / 1K tokens (input), $0.00125 / 1K tokens (output)
- **Average recipe**: ~500 input tokens, ~300 output tokens
- **Cost per recipe**: ~$0.0005
- **1000 recipes**: ~$0.50

### Cost Optimization Tips

1. **Use caching** - Identical recipes won't be re-processed
2. **Choose efficient models** - GPT-3.5-turbo vs GPT-4, Claude Haiku vs Sonnet
3. **Set usage alerts** - Monitor costs in provider dashboards
4. **Use local fallback** - Ollama reduces API calls for development

## Production Deployment

### Environment Variables in Production

```bash
# Use production API keys (different from development)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-prod-your-production-key
OPENAI_MODEL=gpt-3.5-turbo

# Set reasonable timeout for production
AI_TIMEOUT=15000
```

### Monitoring

- Monitor API response times and error rates
- Set up alerts for high API costs
- Log AI provider usage for analytics
- Consider implementing request rate limiting

## Migration from Local to Online

If migrating from Ollama-only setup:

1. **Keep Ollama running** - It serves as automatic fallback
2. **Add API key** - Set `AI_PROVIDER=openai` and add `OPENAI_API_KEY`
3. **Test gradually** - Online APIs will be primary, Ollama fallback
4. **Monitor costs** - Track usage for first few days
5. **Optimize** - Adjust model choice based on cost/quality needs