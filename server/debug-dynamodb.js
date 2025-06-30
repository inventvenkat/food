// Load environment variables
require('dotenv').config();

console.log('🔍 DynamoDB Connection Debug');
console.log('===========================');
console.log('Environment Variables:');
console.log('  DYNAMODB_ENDPOINT_OVERRIDE:', process.env.DYNAMODB_ENDPOINT_OVERRIDE);
console.log('  AWS_REGION:', process.env.AWS_REGION);
console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID);
console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '[SET]' : '[NOT SET]');
console.log('');

// Test the db config
const { docClient } = require('./config/db');
console.log('📡 Testing DynamoDB connection...');

// Test with ListTables
const { ListTablesCommand } = require("@aws-sdk/client-dynamodb");
const { getDynamoClient } = require('./config/db');

async function testConnection() {
  try {
    const client = getDynamoClient();
    const result = await client.send(new ListTablesCommand({}));
    console.log('✅ DynamoDB connection successful!');
    console.log('📋 Tables found:', result.TableNames);
    
    // Test recipe creation
    console.log('');
    console.log('🧪 Testing recipe creation...');
    const { createRecipe } = require('./models/Recipe');
    
    const testRecipe = {
      name: 'Test Recipe - Debug',
      description: 'A test recipe to debug connection',
      ingredients: ['Test ingredient'],
      instructions: 'Test instructions',
      cookingTime: 10,
      servings: 1,
      difficulty: 'Easy',
      category: 'Test',
      tags: ['test'],
      isPublic: true,
      authorId: 'debug-test',
      authorName: 'Debug Test'
    };
    
    const createdRecipe = await createRecipe(testRecipe);
    console.log('✅ Recipe created successfully!');
    console.log('   Recipe ID:', createdRecipe.recipeId);
    
    // Clean up - delete the test recipe
    const { deleteRecipeById } = require('./models/Recipe');
    await deleteRecipeById(createdRecipe.recipeId, 'debug-test');
    console.log('🧹 Test recipe cleaned up');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('📋 Error details:', {
      code: error.code,
      hostname: error.hostname,
      endpoint: error.$metadata?.endpoint
    });
  }
}

testConnection();