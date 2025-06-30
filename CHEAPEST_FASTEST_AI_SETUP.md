# Cheapest & Fastest AI Models Setup Guide

This guide focuses on the **cheapest and fastest** AI models for recipe parsing, prioritizing quantized models and cost-effective APIs.

## 🏆 Recommended Option: Anthropic Claude 3 Haiku

**Why Claude 3 Haiku?**
- **Cheapest**: $0.00025/1K input tokens, $0.00125/1K output tokens  
- **Fast**: ~1-2 second response times
- **Excellent for structured tasks**: Perfect for JSON recipe parsing
- **Cost per recipe**: ~$0.0004 (4/100th of a cent!)

### Setup Steps:

1. **Get Anthropic API Key**
   ```bash
   # Visit: https://console.anthropic.com/
   # Create account, add $5 minimum credit
   # Generate API key
   ```

2. **Configure Environment**
   ```bash
   # In server/.env
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
   ANTHROPIC_MODEL=claude-3-haiku-20240307
   ```

3. **Cost Analysis**
   - **Average recipe**: 400 input + 200 output tokens  
   - **Cost**: $0.0004 per recipe
   - **1000 recipes**: ~$0.40
   - **10,000 recipes**: ~$4.00

## 🚀 Fastest Option: Groq (FREE Tier Available!)

**Why Groq?**
- **FREE tier**: 100 requests/day at no cost
- **Ultra-fast**: Sub-second response times via optimized hardware
- **Quantized models**: LPU-optimized Llama models
- **After free tier**: Still very cheap

### Setup Steps:

1. **Get Groq API Key**
   ```bash
   # Visit: https://console.groq.com/
   # Sign up (no credit card required for free tier)
   # Generate API key
   ```

2. **Configure Environment**
   ```bash
   # In server/.env
   AI_PROVIDER=groq
   GROQ_API_KEY=gsk_your-groq-key-here
   GROQ_MODEL=llama3-8b-8192
   ```

3. **Free Tier Limits**
   - **100 requests/day** for free
   - **Perfect for development/testing**
   - **Paid tier**: $0.27/1M tokens (even cheaper than Anthropic!)

## 💰 Ultra-Cheap Option: Together AI

**Why Together AI?**
- **Open source models**: Meta Llama, Mistral, etc.
- **Very cheap**: $0.20/1M tokens for some models
- **Good variety**: Choose based on speed vs accuracy needs

### Setup Steps:

1. **Get Together AI Key**
   ```bash
   # Visit: https://api.together.xyz/
   # Sign up and add credits
   # Generate API key  
   ```

2. **Configure Environment**
   ```bash
   # In server/.env
   AI_PROVIDER=together
   TOGETHER_API_KEY=your-together-key-here
   TOGETHER_MODEL=meta-llama/Llama-2-7b-chat-hf
   ```

## 📊 Cost Comparison (per 1000 recipes)

| Provider | Model | Cost/1000 Recipes | Speed | Quality |
|----------|-------|-------------------|-------|---------|
| **Groq** | Llama3-8B | **FREE (100/day)** | ⚡ Fastest | ⭐⭐⭐⭐ |
| **Anthropic** | Claude 3 Haiku | **$0.40** | ⚡ Fast | ⭐⭐⭐⭐⭐ |
| **Together AI** | Llama-2-7B | **$0.50** | ⚡ Fast | ⭐⭐⭐⭐ |
| OpenAI | GPT-3.5-turbo | $1.10 | ⚡ Fast | ⭐⭐⭐⭐⭐ |
| **Ollama Local** | Llama3.2:1B | **FREE** | 🐌 Slower | ⭐⭐⭐ |

## 🎯 Recommended Setup Strategy

### For Development/Testing:
```bash
AI_PROVIDER=groq  # FREE tier - 100 requests/day
GROQ_API_KEY=your-groq-key
```

### For Production (Low Volume):
```bash
AI_PROVIDER=anthropic  # Cheapest commercial option
ANTHROPIC_API_KEY=your-anthropic-key
```

### For Production (High Volume):
```bash
AI_PROVIDER=together  # Bulk discounts available
TOGETHER_API_KEY=your-together-key
```

## ⚙️ Performance Optimizations

### 1. Reduced Token Usage
- **Lower max_tokens**: 1024 instead of 2048 (saves 50% on output costs)
- **Shorter timeout**: 15 seconds instead of 30 (faster failures)
- **Optimized prompts**: Concise instructions

### 2. Aggressive Caching
- **SHA256 hashing**: Prevents duplicate API calls for same recipes
- **1-hour TTL**: Reasonable cache lifetime
- **LRU eviction**: Keeps frequently used recipes cached

### 3. Smart Fallback Chain
```
Primary (Fast/Cheap) → Groq → Anthropic → Ollama → Rule-based Parser
```

## 🔧 Quick Setup Commands

### Install Dependencies
```bash
cd server
npm install  # Installs @anthropic-ai/sdk and other packages
```

### Test Each Provider
```bash
# Test Anthropic (cheapest)
curl -X POST http://localhost:3001/api/recipes/parse-with-ai \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipeText": "Pasta with tomato sauce. Cook pasta, heat sauce, combine."}'

# Check logs for cost and speed metrics
```

## 🎛️ Advanced Cost Control

### Environment Variable Switching
```bash
# Development
export AI_PROVIDER=groq

# Testing  
export AI_PROVIDER=anthropic

# Production
export AI_PROVIDER=together
```

### Usage Monitoring
```javascript
// Add to aiRecipeParser.js for cost tracking
console.log(`AI call: ${this.aiProvider}, tokens: ~${tokenCount}, estimated cost: $${cost}`);
```

### Rate Limiting
```javascript
// Optional: Add rate limiting for cost control
const rateLimit = require('express-rate-limit');
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI calls per minute per user
});
```

## 🚨 Important Notes

1. **API Key Security**: Never commit API keys to git
2. **Free Tier Limits**: Monitor usage to avoid overages  
3. **Fallback Strategy**: Always have Ollama as final fallback
4. **Cost Alerts**: Set up billing alerts with providers
5. **Token Optimization**: Shorter prompts = lower costs

## 📈 Scaling Strategy

1. **Start**: Groq free tier for development
2. **Grow**: Anthropic Claude 3 Haiku for production
3. **Scale**: Together AI for high volume with bulk discounts
4. **Enterprise**: Multiple providers with load balancing

This setup gives you the **absolute cheapest and fastest** AI recipe parsing while maintaining quality and reliability!