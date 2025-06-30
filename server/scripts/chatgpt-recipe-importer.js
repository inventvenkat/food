#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key';
const RECIPE_API_URL = process.env.RECIPE_API_URL || 'http://localhost:3002/api/recipes';
const LOGIN_API_URL = process.env.LOGIN_API_URL || 'http://localhost:3002/api/auth/login';

class ChatGPTRecipeImporter {
  constructor() {
    this.authToken = null;
    this.openaiApiKey = OPENAI_API_KEY;
    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  // ChatGPT API call to structure recipe data
  async parseRecipeWithChatGPT(recipeText, filename) {
    const prompt = `
You are a recipe parser. Convert the following recipe text into a well-structured JSON format.

Requirements:
1. Extract the recipe name, description, cooking time (in minutes), servings, category, and tags
2. Parse ingredients into an array of objects with "name", "amount", and "unit"
3. Format instructions as a clear, step-by-step string
4. Determine appropriate category (e.g., "South Indian", "North Indian", "Italian", "Mexican", etc.)
5. Add relevant tags (e.g., ["vegetarian", "spicy", "quick", "healthy"])
6. If cooking time is not specified, estimate based on complexity
7. If servings not specified, estimate reasonable serving size

Recipe text:
"""
${recipeText}
"""

Filename: ${filename}

Return ONLY a JSON object in this exact format:
{
  "name": "Recipe Name",
  "description": "Brief description of the dish",
  "cookingTime": 30,
  "servings": 4,
  "category": "Category Name",
  "tags": ["tag1", "tag2", "tag3"],
  "ingredients": [
    {"name": "ingredient name", "amount": "1", "unit": "cup"},
    {"name": "ingredient name", "amount": "2", "unit": "tbsp"}
  ],
  "instructions": "Step 1: Do this.\\nStep 2: Do that.\\nStep 3: Finish.",
  "isPublic": true
}`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a professional recipe parser. Always return valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content.trim();

      // Try to extract JSON from the response
      let jsonStart = content.indexOf('{');
      let jsonEnd = content.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No JSON found in ChatGPT response');
      }

      const jsonStr = content.substring(jsonStart, jsonEnd);
      return JSON.parse(jsonStr);

    } catch (error) {
      console.error(`❌ ChatGPT parsing failed for ${filename}:`, error.message);
      throw error;
    }
  }

  // Authenticate with your recipe API
  async authenticate() {
    try {
      // Try to create a system user or use existing credentials
      const response = await axios.post(LOGIN_API_URL, {
        email: 'importer@recipes.com',
        password: 'import-password-123'
      });

      this.authToken = response.data.token;
      console.log('✅ Authenticated with recipe API');

    } catch (error) {
      // If login fails, try to register
      try {
        console.log('🔐 Registering new user for recipe API...');
        const resp = await axios.post('http://localhost:3002/api/auth/register', {
          username: 'recipe-importer',
          email: 'importer@recipes.com',
          password: 'import-password-123'
        });

        console.log('✅ Registered new user for recipe API:', resp.data);

        // Now login
        const loginResponse = await axios.post(LOGIN_API_URL, {
          email: 'importer@recipes.com',
          password: 'import-password-123'
        });

        this.authToken = loginResponse.data.token;
        console.log('✅ Registered and authenticated with recipe API');

      } catch (regError) {
        console.error('❌ Authentication failed:', regError.message);
        throw new Error('Could not authenticate with recipe API');
      }
    }
  }

  // Create recipe via API
  async createRecipeViaAPI(recipeData) {
    try {
      const response = await axios.post(
        RECIPE_API_URL,
        {
          name: recipeData.name,
          description: recipeData.description,
          cookingTime: recipeData.cookingTime,
          servings: recipeData.servings,
          instructions: recipeData.instructions,
          category: recipeData.category,
          tags: recipeData.tags,
          ingredients: JSON.stringify(recipeData.ingredients),
          isPublic: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Read recipe files from directory
  readRecipeFiles(directoryPath) {
    const files = fs.readdirSync(directoryPath);
    const recipeFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.txt', '.md', '.recipe'].includes(ext);
    });

    console.log(`📁 Found ${recipeFiles.length} recipe files in ${directoryPath}`);
    return recipeFiles.map(file => ({
      filename: file,
      fullPath: path.join(directoryPath, file),
      content: fs.readFileSync(path.join(directoryPath, file), 'utf8')
    }));
  }

  // Process a single recipe file
  async processRecipe(recipeFile) {
    console.log(`📝 Processing: ${recipeFile.filename}`);

    try {
      // Step 1: Parse with ChatGPT
      console.log('   🤖 Parsing with ChatGPT...');
      const parsedRecipe = await this.parseRecipeWithChatGPT(
        recipeFile.content,
        recipeFile.filename
      );

      // Step 2: Create via API
      console.log('   📡 Creating via API...');
      const createdRecipe = await this.createRecipeViaAPI(parsedRecipe);

      console.log(`   ✅ Success: ${parsedRecipe.name} (ID: ${createdRecipe.recipeId})`);
      this.stats.successful++;

      return { success: true, recipe: createdRecipe };

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      this.stats.failed++;
      this.stats.errors.push({
        file: recipeFile.filename,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  // Main import process
  async importRecipes(directoryPath) {
    console.log('🚀 ChatGPT Recipe Importer Starting...');
    console.log('=====================================');

    // Validate inputs
    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }

    if (!this.openaiApiKey || this.openaiApiKey === 'your-openai-api-key') {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }

    try {
      // Step 1: Authenticate
      console.log('🔐 Authenticating...');
      await this.authenticate();

      // Step 2: Read recipe files
      const recipeFiles = this.readRecipeFiles(directoryPath);

      if (recipeFiles.length === 0) {
        console.log('❌ No recipe files found. Supported formats: .txt, .md, .recipe');
        return;
      }

      // Step 3: Process each recipe
      console.log('\\n📚 Processing recipes...');
      for (const recipeFile of recipeFiles) {
        await this.processRecipe(recipeFile);
        this.stats.processed++;

        // Small delay to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 4: Show results
      this.showResults();

    } catch (error) {
      console.error('💥 Import failed:', error.message);
      process.exit(1);
    }
  }

  showResults() {
    console.log('\\n📊 Import Results:');
    console.log('==================');
    console.log(`📁 Total files processed: ${this.stats.processed}`);
    console.log(`✅ Successfully imported: ${this.stats.successful}`);
    console.log(`❌ Failed: ${this.stats.failed}`);

    if (this.stats.errors.length > 0) {
      console.log('\\n❌ Errors:');
      this.stats.errors.forEach(error => {
        console.log(`   ${error.file}: ${error.error}`);
      });
    }

    if (this.stats.successful > 0) {
      console.log('\\n🎉 Import completed successfully!');
      console.log('🌐 Check your app:');
      console.log('   - Discover page: http://localhost:3003/discover');
      console.log('   - Meal planner: http://localhost:3003/meal-planner');
    }
  }
}

// CLI usage
if (require.main === module) {
  const directoryPath = process.argv[2];

  if (!directoryPath) {
    console.log('Usage: node chatgpt-recipe-importer.js <recipe-directory>');
    console.log('');
    console.log('Example:');
    console.log('  node chatgpt-recipe-importer.js ./my-recipes');
    console.log('');
    console.log('Supported file formats: .txt, .md, .recipe');
    console.log('Make sure to set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  const importer = new ChatGPTRecipeImporter();
  importer.importRecipes(directoryPath);
}

module.exports = ChatGPTRecipeImporter;