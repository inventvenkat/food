// Load environment variables
require('dotenv').config();

console.log('🔍 Debugging Recipe Import');
console.log('=========================');

async function debugImport() {
  try {
    // 1. Test environment variables
    console.log('1️⃣ Environment Variables:');
    console.log(`   DYNAMODB_ENDPOINT_OVERRIDE: ${process.env.DYNAMODB_ENDPOINT_OVERRIDE}`);
    console.log(`   AWS_REGION: ${process.env.AWS_REGION}`);
    console.log(`   RECIPES_TABLE_NAME: ${process.env.RECIPES_TABLE_NAME}`);
    console.log('');

    // 2. Test DynamoDB connection
    console.log('2️⃣ Testing DynamoDB connection...');
    const { getDynamoClient } = require('./config/db');
    const { ListTablesCommand } = require("@aws-sdk/client-dynamodb");
    
    const client = getDynamoClient();
    const result = await client.send(new ListTablesCommand({}));
    console.log(`   ✅ Connected! Tables: ${result.TableNames.join(', ')}`);
    console.log('');

    // 3. Test recipe model
    console.log('3️⃣ Testing Recipe model...');
    const { createRecipe } = require('./models/Recipe');
    console.log('   ✅ Recipe model loaded successfully');
    console.log('');

    // 4. Test simple recipe creation
    console.log('4️⃣ Testing simple recipe creation...');
    const testRecipe = {
      name: 'Debug Test Recipe',
      description: 'Simple test recipe',
      ingredients: ['Test ingredient 1', 'Test ingredient 2'],
      instructions: 'Mix ingredients and serve.',
      cookingTime: 10,
      servings: 2,
      difficulty: 'Easy',
      category: 'Test',
      tags: ['test', 'debug'],
      isPublic: true,
      authorId: 'debug-test-user',
      authorName: 'Debug User'
    };

    const createdRecipe = await createRecipe(testRecipe);
    console.log('   ✅ Test recipe created successfully!');
    console.log(`   Recipe ID: ${createdRecipe.recipeId}`);
    console.log('');

    // 5. Clean up test recipe
    console.log('5️⃣ Cleaning up test recipe...');
    const { deleteRecipeById } = require('./models/Recipe');
    await deleteRecipeById(createdRecipe.recipeId, 'debug-test-user');
    console.log('   ✅ Test recipe deleted');
    console.log('');

    // 6. Check Indian recipes data file
    console.log('6️⃣ Checking Indian recipes data...');
    const fs = require('fs');
    const path = require('path');
    const recipesPath = path.join(__dirname, 'data', 'indian-recipes.json');
    
    if (fs.existsSync(recipesPath)) {
      const recipesData = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
      console.log(`   ✅ Found ${recipesData.length} recipes in data file`);
      console.log(`   First recipe: ${recipesData[0]?.name}`);
    } else {
      console.log('   ❌ Indian recipes data file not found!');
      console.log(`   Looking for: ${recipesPath}`);
    }
    console.log('');

    console.log('🎉 All tests passed! The import should work.');
    console.log('');
    console.log('💡 If the import still fails, please share the exact error message.');

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    console.error('Stack trace:', error.stack);
    console.log('');
    console.log('🔧 Common solutions:');
    console.log('   1. Make sure DynamoDB Local is running: docker compose up -d dynamodb-local');
    console.log('   2. Initialize tables: node config/init-dynamodb.js');
    console.log('   3. Check .env file exists and has correct values');
  }
}

debugImport();