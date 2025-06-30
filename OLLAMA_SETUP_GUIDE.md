# Ollama Setup Guide for AI Recipe Parsing

This guide will help you set up Ollama to enable AI-powered recipe parsing in the recipe management application.

## Prerequisites

- Docker and Docker Compose (for the main application)
- Ollama installed on your system

## Installation Steps

### 1. Install Ollama

**Linux/macOS:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download and install from: https://ollama.ai/download

### 2. Start Ollama Service

**Linux/macOS:**
```bash
ollama serve
```

**Windows:**
Ollama runs as a service automatically after installation.

### 3. Download Required Model

Download the recommended model for recipe parsing:

```bash
# Fast, efficient model (2GB) - Recommended for development
ollama pull llama3.2:3b

# OR, for better accuracy (4GB) - Use if you have sufficient RAM
ollama pull llama3.2:7b
```

### 4. Verify Installation

Test that Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response listing your installed models.

### 5. Configure Environment Variables

The application uses these environment variables (already configured in `server/.env`):

```bash
# AI Configuration (Ollama)
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
AI_TIMEOUT=30000
```

**Note:** If you downloaded the 7b model, change `OLLAMA_MODEL=llama3.2:7b`

### 6. Install Dependencies and Start Application

```bash
# Install new axios dependency
cd server
npm install

# Start the full application stack
cd ..
docker-compose up
```

## Testing the AI Recipe Parsing

1. Navigate to http://localhost:3003
2. Go to "Create Recipe"
3. In the AI-Powered Recipe Assistant section:
   - Paste any recipe text (ingredients, instructions, etc.)
   - Click "Parse Recipe with AI"
   - The form should auto-fill with extracted data

## Troubleshooting

### Ollama Not Running
- **Error**: "AI service (Ollama) is not available"
- **Solution**: Ensure `ollama serve` is running and accessible at http://localhost:11434

### Model Not Found
- **Error**: "model not found"
- **Solution**: Run `ollama pull llama3.2:3b` to download the model

### Slow Response Times
- **Model**: The 3b model should respond in 1-3 seconds
- **Hardware**: Ensure sufficient RAM (4GB+ recommended)
- **Alternative**: Try a smaller model like `llama3.2:1b`

### Memory Issues
- **3B Model**: Requires ~2GB RAM
- **7B Model**: Requires ~4GB RAM
- **Solution**: Use a smaller model or increase system memory

## Production Deployment

For production deployment:

1. **Docker Compose Integration**: Add Ollama service to `docker-compose.yml`
2. **Model Persistence**: Ensure models are downloaded in the container
3. **Resource Limits**: Set appropriate CPU/memory limits
4. **Health Checks**: Add health checks for the Ollama service

Example Docker service addition:
```yaml
ollama:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama_data:/root/.ollama
  environment:
    - OLLAMA_MODELS=llama3.2:3b
```

## API Endpoint Details

The new AI parsing endpoint:
- **URL**: `POST /api/recipes/parse-with-ai`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "recipeText": "recipe content..." }`
- **Response**: Structured recipe data in JSON format
- **Fallback**: Uses rule-based parser if AI fails