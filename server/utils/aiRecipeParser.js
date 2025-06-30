const axios = require('axios');
const aiCache = require('./aiCache');

class AIRecipeParser {
  constructor(ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434') {
    this.ollamaEndpoint = ollamaEndpoint;
    this.defaultModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    this.timeout = parseInt(process.env.AI_TIMEOUT) || 30000; // 30 seconds
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

    return `Please parse the following recipe text and reformat it into the JSON structure specified below. Ensure all fields are populated as accurately as possible. If a field cannot be determined, use an empty string "" or null for that field, or an empty array [] for ingredients and tags.

JSON Structure to use:
${JSON.stringify(jsonStructure, null, 2)}

Recipe Text:
${recipeText}

Your response must be a single, valid JSON object with no additional text or formatting:`;
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
   * Parse recipe text using Ollama local model with caching
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

    // Check if Ollama is available
    const isAvailable = await this.checkOllamaAvailability();
    if (!isAvailable) {
      throw new Error('AI service (Ollama) is not available. Please ensure Ollama is running.');
    }

    const prompt = this.generateRecipeParsingPrompt(recipeText);

    try {
      const response = await axios.post(`${this.ollamaEndpoint}/api/generate`, {
        model: this.defaultModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent structured output
          top_p: 0.9,
          max_tokens: 2048
        }
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data || !response.data.response) {
        throw new Error('Invalid response from AI model');
      }

      // Clean and parse the AI response
      let aiOutput = response.data.response.trim();
      
      // Remove any potential markdown code blocks
      aiOutput = aiOutput.replace(/^```json\s*|\s*```$/g, '');
      
      // Try to parse as JSON
      let parsedData;
      try {
        parsedData = JSON.parse(aiOutput);
      } catch (parseError) {
        console.error('Failed to parse AI output as JSON:', parseError.message);
        console.error('AI output was:', aiOutput);
        throw new Error('AI returned invalid JSON format');
      }

      // Validate the parsed data structure
      const validatedData = this.validateAndSanitizeResponse(parsedData);
      
      // Cache the successful result
      aiCache.set(recipeText, validatedData);
      
      return validatedData;

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('AI request timed out. Please try again.');
      } else if (error.response) {
        console.error('Ollama API error:', error.response.data);
        throw new Error(`AI service error: ${error.response.data.error || 'Unknown error'}`);
      } else if (error.request) {
        throw new Error('Failed to connect to AI service. Please ensure Ollama is running.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate and sanitize the AI response to ensure it matches expected structure
   */
  validateAndSanitizeResponse(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('AI response is not a valid object');
    }

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

    return sanitized;
  }

  /**
   * Sanitize string fields
   */
  sanitizeString(value) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
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
}

module.exports = AIRecipeParser;