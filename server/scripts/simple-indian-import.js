// Simple Indian recipes import with explicit local DynamoDB configuration
const fs = require('fs');
const path = require('path');

// Set environment variables explicitly for DynamoDB Local
process.env.DYNAMODB_ENDPOINT_OVERRIDE = 'http://localhost:8000';
process.env.AWS_ACCESS_KEY_ID = 'dummyKeyId';
process.env.AWS_SECRET_ACCESS_KEY = 'dummySecretKey';
process.env.AWS_REGION = 'us-east-1';
process.env.RECIPES_TABLE_NAME = 'recipe-app-all-resources';

// Load dotenv after setting environment variables
require('dotenv').config();

console.log('🇮🇳 Simple Indian Recipes Import');
console.log('================================');
console.log('🔧 Using hardcoded local DynamoDB configuration');
console.log('');

async function simpleImport() {
  try {
    // Load the Recipe model after environment is set
    const { createRecipe } = require('../models/Recipe');
    
    // Read the recipes data
    const recipesPath = path.join(__dirname, '..', 'data', 'indian-recipes.json');
    if (!fs.existsSync(recipesPath)) {
      throw new Error(`Recipes file not found: ${recipesPath}`);
    }
    
    const recipesData = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
    console.log(`📖 Found ${recipesData.length} recipes to import`);
    console.log('');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Create a system user ID for these public recipes
    const systemUserId = 'system-indian-recipes';
    
    for (let i = 0; i < recipesData.length; i++) {
      const recipeData = recipesData[i];
      
      try {
        console.log(`📝 Creating recipe ${i + 1}/${recipesData.length}: ${recipeData.name}`);
        
        // Prepare recipe object for DynamoDB
        const recipe = {
          name: recipeData.name,
          description: recipeData.description,
          ingredients: recipeData.ingredients,
          instructions: recipeData.instructions,
          cookingTime: recipeData.cookingTime,
          servings: recipeData.servings,
          difficulty: recipeData.difficulty,
          category: recipeData.category,
          tags: recipeData.tags || [],
          isPublic: true,
          authorId: systemUserId,
          authorName: 'Indian Cuisine Collection',
          nutritionalInfo: recipeData.nutritionalInfo || {},
          source: 'Traditional Indian Recipes',
          license: 'Traditional Knowledge - Public Domain'
        };
        
        // Create the recipe
        const createdRecipe = await createRecipe(recipe);
        console.log(`   ✅ Created: ${recipe.name} (ID: ${createdRecipe.recipeId})`);
        successCount++;
        
        // Small delay to avoid overwhelming DynamoDB
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`   ❌ Failed to create ${recipeData.name}:`, error.message);
        errorCount++;
        
        // Continue with next recipe instead of stopping
        continue;
      }
    }
    
    console.log('');
    console.log('📊 Import Summary:');
    console.log(`✅ Successfully imported: ${successCount} recipes`);
    console.log(`❌ Failed imports: ${errorCount} recipes`);
    console.log(`📈 Success rate: ${((successCount / recipesData.length) * 100).toFixed(1)}%`);
    
    if (successCount > 0) {
      console.log('');
      console.log('🎉 Indian recipes have been successfully added to your database!');
      console.log('🍛 Users can now plan meals with traditional Indian dishes');
      console.log('🔍 These recipes are publicly available for all users');
      console.log('');
      console.log('🚀 Next steps:');
      console.log('   1. Start your app: npm start (in server and client directories)');
      console.log('   2. Go to http://localhost:3000/meal-planner');
      console.log('   3. Click on a date and select Indian recipes from the dropdown');
    } else {
      console.log('');
      console.log('❌ No recipes were imported successfully');
      console.log('💡 Check the error messages above for troubleshooting');
    }
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting steps:');
    console.error('   1. Make sure DynamoDB Local is running: docker compose up -d dynamodb-local');
    console.error('   2. Test connection: curl http://localhost:8000');
    console.error('   3. Initialize tables: node config/init-dynamodb.js');
    process.exit(1);
  }
}

// Run the import
simpleImport();