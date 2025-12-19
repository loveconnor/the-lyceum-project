# Ollama Integration Guide

## Overview
The Lyceum backend now supports using local Ollama models as an alternative to OpenAI. **This feature is only available in development mode** for cost savings and local testing.

## Security
- Ollama models can **only** be used when `NODE_ENV` is not set to `production`
- If you try to use Ollama in production, the application will throw an error and refuse to start
- This ensures production deployments always use reliable cloud-based models

## Setup Instructions

### 1. Install Ollama
Download and install Ollama from: https://ollama.ai

### 2. Pull a Model
```bash
ollama pull llama3.2
# or any other model you prefer
```

### 3. Configure Environment Variables
Edit `apps/backend/.env.local`:

```env
# Enable Ollama
USE_OLLAMA=true

# Optional: customize Ollama settings
OLLAMA_BASE_URL=http://localhost:11434/v1  # default
OLLAMA_MODEL=llama3.2                      # default

# Make sure you're in development mode
NODE_ENV=development
```

### 4. Start Ollama Service
Make sure Ollama is running:
```bash
ollama serve
```

### 5. Start Your Backend
```bash
cd apps/backend
npm run dev
```

## Switching Back to OpenAI
To use OpenAI instead of Ollama, simply set:
```env
USE_OLLAMA=false
```

Or remove the `USE_OLLAMA` variable entirely (defaults to false).

## Supported Models
You can use any model available in Ollama. Popular options:
- `llama3.2` - Fast and capable
- `llama3.1` - Larger, more capable
- `mistral` - Good for code
- `codellama` - Specialized for code
- `phi3` - Smaller, faster

Check available models: `ollama list`
Pull new models: `ollama pull <model-name>`

## Troubleshooting

### Error: "Ollama models are not allowed in production"
**Solution**: Check your `NODE_ENV` variable. Set it to `development` or remove it entirely.

### Connection refused / Cannot connect to Ollama
**Solution**: Make sure Ollama is running (`ollama serve`)

### Slow responses
**Solution**: Try a smaller model like `phi3` or `llama3.2`

## Production Deployment
When deploying to production:
1. Set `NODE_ENV=production`
2. Ensure `USE_OLLAMA=false` (or don't set it)
3. Provide valid `OPENAI_API_KEY`

The application will automatically use OpenAI in production regardless of the `USE_OLLAMA` setting.
