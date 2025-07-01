const axios = require('axios');
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const aiCache = require('./aiCache');

class AIRecipeParser {
  constructor() {
    // AI Service Configuration - optimized for cheapest/fastest
    this.aiProvider = process.env.AI_PROVIDER || 'groq'; // 'groq', 'anthropic', 'openai', 'together', 'ollama'
    this.timeout = parseInt(process.env.AI_TIMEOUT) || 15000; // Reduced timeout for speed
    
    // OpenAI Configuration  
    this.openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null;
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'; // Cheapest OpenAI model
    
    // Anthropic Configuration (Often cheapest for structured tasks)
    this.anthropicClient = process.env.ANTHROPIC_API_KEY ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }) : null;
    this.anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'; // Cheapest Claude model
    
    // Groq Configuration (Fastest inference)
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqModel = process.env.GROQ_MODEL || 'llama3-8b-8192';
    
    // xAI Configuration (Grok models)
    this.xaiApiKey = process.env.XAI_API_KEY || process.env.GROQ_API_KEY; // Allow using GROQ_API_KEY for xAI
    this.xaiModel = process.env.XAI_MODEL || 'grok-2-latest'; // Fast quantized model
    
    // Together AI Configuration (Cheap alternative)
    this.togetherApiKey = process.env.TOGETHER_API_KEY;
    this.togetherModel = process.env.TOGETHER_MODEL || 'meta-llama/Llama-2-7b-chat-hf';
    
    // Ollama Configuration (Local fallback)
    this.ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:1b'; // Smallest model for speed
  }

  /**
   * Generate prompt for recipe parsing with the same JSON structure as frontend
   */
  generateRecipeParsingPrompt(recipeText) {
    const jsonStructure = {
      title: "string | null",
      description: "string | null", 
      cookingTime: "string | null",
      servings: "string | null",
      category: "string | null",
      tags: ["string", "string"],
      ingredients: [
        { quantity: "string | null", unit: "string | null", name: "string" }
      ],
      instructions: "string | null"
    };

    return `You are a recipe parsing expert. Extract ALL the following information from the recipe text and return it as a valid JSON object. 

IMPORTANT: You MUST extract these fields if they exist in the text:
- title: Recipe name/title
- description: Brief description of the dish
- cookingTime: Total cooking/prep time (e.g., "30 minutes", "1 hour")
- servings: Number of people served (e.g., "4", "6 servings")
- category: Type of dish (e.g., "Main Course", "Dessert", "Appetizer")
- tags: Keywords/descriptors (e.g., ["vegetarian", "quick", "healthy"])
- ingredients: List with quantity, unit, and name
- instructions: Step-by-step cooking instructions

JSON Structure to use:
${JSON.stringify(jsonStructure, null, 2)}

Recipe Text:
${recipeText}

Extract as much information as possible. If a field is not found in the text, use null for strings, [] for arrays. Return ONLY the JSON object, no other text:`;
  }

  /**
   * Check if Ollama service is available
   */
  async checkOllamaAvailability() {
    try {
      const response = await axios.get(`${this.ollamaEndpoint}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('Ollama service not available:', error.message);
      return false;
    }
  }

  /**
   * Parse recipe text using configured AI provider with fallback chain
   */
  async parseRecipeWithAI(recipeText) {
    if (!recipeText || typeof recipeText !== 'string' || recipeText.trim().length === 0) {
      throw new Error('Recipe text is required and must be a non-empty string');
    }

    // Check cache first
    const cachedResult = aiCache.get(recipeText);
    if (cachedResult) {
      console.log('Using cached AI parsing result');
      return cachedResult;
    }

    const errors = [];

    // Try primary AI provider first
    try {
      const result = await this.callAIProvider(recipeText);
      // Cache successful result
      aiCache.set(recipeText, result);
      return result;
    } catch (error) {
      console.error(`Primary AI provider (${this.aiProvider}) failed:`, error.message);
      errors.push(`${this.aiProvider}: ${error.message}`);
    }

    // Fallback to Ollama if primary fails and it's not already Ollama
    if (this.aiProvider !== 'ollama') {
      try {
        const result = await this.parseWithOllama(recipeText);
        aiCache.set(recipeText, result);
        return result;
      } catch (error) {
        console.error('Ollama fallback failed:', error.message);
        errors.push(`ollama: ${error.message}`);
      }
    }

    // If all AI methods fail, throw error with details
    throw new Error(`All AI providers failed: ${errors.join('; ')}`);
  }

  /**
   * Call the configured AI provider
   */
  async callAIProvider(recipeText) {
    switch (this.aiProvider) {
      case 'xai':
      case 'groq': // Handle both since key might be xAI
        return await this.parseWithXAI(recipeText);
      case 'anthropic':
        return await this.parseWithAnthropic(recipeText);
      case 'openai':
        return await this.parseWithOpenAI(recipeText);
      case 'together':
        return await this.parseWithTogether(recipeText);
      case 'ollama':
        return await this.parseWithOllama(recipeText);
      default:
        throw new Error(`Unsupported AI provider: ${this.aiProvider}`);
    }
  }

  /**
   * Parse recipe using OpenAI API
   */
  async parseWithOpenAI(recipeText) {
    if (!this.openaiClient) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.generateRecipeParsingPrompt(recipeText);

    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: this.openaiModel,
        messages: [
          {
            role: "system",
            content: "You are a recipe parsing assistant. Parse recipes into JSON format exactly as requested. Return only valid JSON, no additional text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2048,
      });

      const aiOutput = completion.choices[0]?.message?.content?.trim();
      if (!aiOutput) {
        throw new Error('Empty response from OpenAI');
      }

      return this.parseAndValidateAIResponse(aiOutput);

    } catch (error) {
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key.');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
  }

  /**
   * Parse recipe using Anthropic API (Claude 3 Haiku - cheapest Claude model)
   */
  async parseWithAnthropic(recipeText) {
    if (!this.anthropicClient) {
      throw new Error('Anthropic API key not configured');
    }

    const prompt = this.generateRecipeParsingPrompt(recipeText);

    try {
      const message = await this.anthropicClient.messages.create({
        model: this.anthropicModel,
        max_tokens: 1024, // Reduced for cost savings
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const aiOutput = message.content[0]?.text?.trim();
      if (!aiOutput) {
        throw new Error('Empty response from Anthropic');
      }

      return this.parseAndValidateAIResponse(aiOutput);

    } catch (error) {
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key.');
      } else if (error.status === 429) {
        throw new Error('Anthropic rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
    }
  }

  /**
   * Parse recipe using xAI/Grok API (Fast inference)
   */
  async parseWithXAI(recipeText) {
    if (!this.xaiApiKey) {
      throw new Error('xAI API key not configured');
    }

    const prompt = this.generateRecipeParsingPrompt(recipeText);

    try {
      const response = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: this.xaiModel,
        messages: [
          {
            role: "system",
            content: "You are a recipe parsing assistant. Parse recipes into JSON format exactly as requested. Return only valid JSON, no additional text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }, {
        headers: {
          'Authorization': `Bearer ${this.xaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      const aiOutput = response.data.choices[0]?.message?.content?.trim();
      if (!aiOutput) {
        throw new Error('Empty response from xAI');
      }

      // console.log('xAI raw response:', aiOutput); // DEBUG
      return this.parseAndValidateAIResponse(aiOutput);

    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid xAI API key.');
      } else if (error.response?.status === 429) {
        throw new Error('xAI rate limit exceeded. Please try again later.');
      } else if (error.response) {
        console.error('xAI API error response:', error.response.data); // DEBUG
        throw new Error(`xAI API error: ${error.response.data.error?.message || 'Unknown error'}`);
      } else {
        throw new Error(`xAI API error: ${error.message}`);
      }
    }
  }

  /**
   * Parse recipe using Together AI (Cheap open source models)
   */
  async parseWithTogether(recipeText) {
    if (!this.togetherApiKey) {
      throw new Error('Together AI API key not configured');
    }

    const prompt = this.generateRecipeParsingPrompt(recipeText);

    try {
      const response = await axios.post('https://api.together.xyz/v1/chat/completions', {
        model: this.togetherModel,
        messages: [
          {
            role: "system",
            content: "You are a recipe parsing assistant. Parse recipes into JSON format exactly as requested. Return only valid JSON, no additional text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }, {
        headers: {
          'Authorization': `Bearer ${this.togetherApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      const aiOutput = response.data.choices[0]?.message?.content?.trim();
      if (!aiOutput) {
        throw new Error('Empty response from Together AI');
      }

      return this.parseAndValidateAIResponse(aiOutput);

    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Together AI API key.');
      } else if (error.response?.status === 429) {
        throw new Error('Together AI rate limit exceeded. Please try again later.');
      } else if (error.response) {
        throw new Error(`Together AI error: ${error.response.data.error?.message || 'Unknown error'}`);
      } else {
        throw new Error(`Together AI error: ${error.message}`);
      }
    }
  }

  /**
   * Parse recipe using Ollama (local model)
   */
  async parseWithOllama(recipeText) {
    const isAvailable = await this.checkOllamaAvailability();
    if (!isAvailable) {
      throw new Error('Ollama service not available');
    }

    const prompt = this.generateRecipeParsingPrompt(recipeText);

    try {
      const response = await axios.post(`${this.ollamaEndpoint}/api/generate`, {
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 2048
        }
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const aiOutput = response.data.response?.trim();
      if (!aiOutput) {
        throw new Error('Empty response from Ollama');
      }

      return this.parseAndValidateAIResponse(aiOutput);

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Ollama request timed out');
      } else if (error.response) {
        throw new Error(`Ollama error: ${error.response.data.error || 'Unknown error'}`);
      } else if (error.request) {
        throw new Error('Failed to connect to Ollama service');
      } else {
        throw error;
      }
    }
  }

  /**
   * Parse and validate AI response from any provider
   */
  parseAndValidateAIResponse(aiOutput) {
    // Remove any potential markdown code blocks
    const cleanedOutput = aiOutput.replace(/^```json\s*|\s*```$/g, '').trim();
    
    // Try to parse as JSON
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedOutput);
    } catch (parseError) {
      console.error('Failed to parse AI output as JSON:', parseError.message);
      console.error('AI output was:', cleanedOutput);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate the parsed data structure
    return this.validateAndSanitizeResponse(parsedData);
  }

  /**
   * Validate and sanitize the AI response to ensure it matches expected structure
   */
  validateAndSanitizeResponse(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('AI response is not a valid object');
    }

    // console.log('Raw AI response data:', JSON.stringify(data, null, 2)); // DEBUG

    // Sanitize and validate each field
    const sanitized = {
      title: this.sanitizeString(data.title),
      description: this.sanitizeString(data.description),
      cookingTime: this.sanitizeString(data.cookingTime),
      servings: this.sanitizeString(data.servings),
      category: this.sanitizeString(data.category),
      tags: this.sanitizeArray(data.tags),
      ingredients: this.sanitizeIngredients(data.ingredients),
      instructions: this.sanitizeString(data.instructions)
    };

    // console.log('Sanitized response:', JSON.stringify(sanitized, null, 2)); // DEBUG

    return sanitized;
  }

  /**
   * Sanitize string fields
   */
  sanitizeString(value) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null; // Frontend handles null values correctly
  }

  /**
   * Sanitize array fields (for tags)
   */
  sanitizeArray(value) {
    if (Array.isArray(value)) {
      return value
        .filter(item => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim());
    }
    return [];
  }

  /**
   * Sanitize ingredients array
   */
  sanitizeIngredients(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter(ingredient => ingredient && typeof ingredient === 'object')
      .map(ingredient => ({
        quantity: this.sanitizeString(ingredient.quantity) || '1',
        unit: this.sanitizeString(ingredient.unit) || '',
        name: this.sanitizeString(ingredient.name) || ''
      }))
      .filter(ingredient => ingredient.name.length > 0); // Only keep ingredients with names
  }

  /**
   * Generate a general AI response for chat/assistance (not recipe parsing)
   */
  async generateResponse(prompt) {
    try {
      // Use the same AI provider as recipe parsing for consistency
      switch (this.aiProvider) {
        case 'xai':
        case 'groq':
          return await this.generateWithXAI(prompt);
        case 'anthropic':
          return await this.generateWithAnthropic(prompt);
        case 'openai':
          return await this.generateWithOpenAI(prompt);
        case 'together':
          return await this.generateWithTogether(prompt);
        case 'ollama':
        default:
          return await this.generateWithOllama(prompt);
      }
    } catch (error) {
      console.error(`AI response generation failed with ${this.aiProvider}:`, error.message);
      
      // Fallback to Ollama if primary provider fails
      if (this.aiProvider !== 'ollama') {
        try {
          return await this.generateWithOllama(prompt);
        } catch (fallbackError) {
          console.error('Ollama fallback for response generation failed:', fallbackError.message);
        }
      }
      
      throw new Error('Unable to generate AI response');
    }
  }

  // AI Response Generation Methods (for chat, not structured recipe parsing)

  async generateWithXAI(prompt) {
    if (!this.xaiApiKey) {
      throw new Error('xAI API key not configured');
    }

    const response = await axios.post('https://api.x.ai/v1/chat/completions', {
      model: this.xaiModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${this.xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout
    });

    return response.data.choices[0].message.content.trim();
  }

  async generateWithAnthropic(prompt) {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not configured');
    }

    const response = await this.anthropicClient.messages.create({
      model: this.anthropicModel,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    return response.content[0].text.trim();
  }

  async generateWithOpenAI(prompt) {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not configured');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: this.openaiModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  }

  async generateWithTogether(prompt) {
    if (!this.togetherApiKey) {
      throw new Error('Together API key not configured');
    }

    const response = await axios.post('https://api.together.xyz/inference', {
      model: this.togetherModel,
      prompt: prompt,
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${this.togetherApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout
    });

    return response.data.output.choices[0].text.trim();
  }

  async generateWithOllama(prompt) {
    const response = await axios.post(`${this.ollamaEndpoint}/api/generate`, {
      model: this.ollamaModel,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 500
      }
    }, {
      timeout: this.timeout
    });

    return response.data.response.trim();
  }
}

module.exports = AIRecipeParser;