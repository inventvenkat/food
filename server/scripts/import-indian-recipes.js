const fs = require('fs');
const path = require('path');
const { createRecipe } = require('../models/Recipe');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Debug: Print connection info
console.log('🔧 Database Configuration:');
console.log(`   DYNAMODB_ENDPOINT_OVERRIDE: ${process.env.DYNAMODB_ENDPOINT_OVERRIDE}`);
console.log(`   AWS_REGION: ${process.env.AWS_REGION}`);
console.log(`   RECIPES_TABLE_NAME: ${process.env.RECIPES_TABLE_NAME}`);
console.log('');

async function importIndianRecipes() {
  try {
    console.log('🇮🇳 Starting Indian Recipes Import...');
    
    // Test DynamoDB connection first
    console.log('🔍 Testing DynamoDB connection...');
    const { getDynamoClient } = require('../config/db');
    const { ListTablesCommand } = require("@aws-sdk/client-dynamodb");
    
    try {
      const client = getDynamoClient();
      const result = await client.send(new ListTablesCommand({}));
      console.log('✅ DynamoDB connection successful!');
      console.log(`📋 Tables available: ${result.TableNames.join(', ')}`);
    } catch (connectionError) {
      console.error('❌ DynamoDB connection failed!');
      console.error('   Error:', connectionError.message);
      console.error('');
      console.error('🔧 Troubleshooting:');
      console.error('   1. Make sure DynamoDB Local is running:');
      console.error('      docker compose up -d dynamodb-local');
      console.error('   2. Check if it\'s accessible:');
      console.error('      curl http://localhost:8000');
      console.error('   3. Initialize tables:');
      console.error('      node config/init-dynamodb.js');
      throw new Error('DynamoDB connection failed');
    }
    
    // Read the recipes data
    const recipesPath = path.join(__dirname, '..', 'data', 'indian-recipes.json');
    const recipesData = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
    
    console.log(`📖 Found ${recipesData.length} recipes to import`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Create a system user ID for these public recipes
    const systemUserId = 'system-indian-recipes';
    
    for (const recipeData of recipesData) {
      try {
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
        console.log(`✅ Created: ${recipe.name} (ID: ${createdRecipe.recipeId})`);
        successCount++;
        
        // Small delay to avoid overwhelming DynamoDB
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to create ${recipeData.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${successCount} recipes`);
    console.log(`❌ Failed imports: ${errorCount} recipes`);
    console.log(`📈 Success rate: ${((successCount / recipesData.length) * 100).toFixed(1)}%`);
    
    if (successCount > 0) {
      console.log('\n🎉 Indian recipes have been successfully added to your database!');
      console.log('🍛 Users can now plan meals with traditional Indian dishes');
      console.log('🔍 These recipes are publicly available for all users');
    }
    
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
}

// Run the import if this script is executed directly
if (require.main === module) {
  importIndianRecipes()
    .then(() => {
      console.log('\n🏁 Import process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { importIndianRecipes };