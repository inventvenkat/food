# Quantized Model Research for Recipe Parsing

## Option 1: Ollama (Recommended)
**Overview**: Local LLM hosting platform that runs quantized models efficiently

**Pros**:
- Simple REST API for Node.js integration
- Supports many open-source models (Llama, Mistral, CodeLlama, etc.)
- Automatic model downloading and management
- Low memory usage with quantization
- Docker support for easy deployment

**Integration Approach**:
```javascript
// Example API call to Ollama
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.2',
    prompt: recipeParsingPrompt,
    stream: false
  })
});
```

**Recommended Models for Recipe Parsing**:
- `llama3.2:3b` - Fast, efficient for structured text tasks
- `mistral:7b` - Good balance of speed/accuracy
- `codellama:7b` - Excellent for JSON structured output

## Option 2: Hugging Face Transformers.js
**Overview**: Run models directly in Node.js without external services

**Pros**:
- No external dependencies or services
- Direct model loading in JavaScript
- Good for specific NLP tasks

**Cons**:
- Limited model selection for text-to-JSON tasks
- May require more memory than Ollama
- More complex setup for custom models

## Option 3: TensorFlow Lite + Node.js
**Overview**: Quantized models optimized for edge deployment

**Pros**:
- Extremely fast inference
- Very low memory usage

**Cons**:
- Limited pre-trained models for recipe parsing
- Would require custom model training
- Complex text-to-JSON pipeline

## Recommendation: Ollama with Llama3.2:3b

**Rationale**:
1. **Easy Integration**: Simple HTTP API
2. **Model Management**: Automatic downloads and updates
3. **Performance**: Quantized models run efficiently
4. **Flexibility**: Easy to swap models based on needs
5. **Deployment**: Docker support matches current infrastructure

**Memory Requirements**:
- 3B parameter model: ~2GB RAM
- 7B parameter model: ~4GB RAM
- Current app likely has sufficient resources

**API Response Time**: 
- Expected 1-3 seconds for recipe parsing
- Acceptable for user experience vs. manual LLM workflow