// Test single recipe creation
process.env.DYNAMODB_ENDPOINT_OVERRIDE = 'http://localhost:8000';
process.env.AWS_ACCESS_KEY_ID = 'dummyKeyId';
process.env.AWS_SECRET_ACCESS_KEY = 'dummySecretKey';
process.env.AWS_REGION = 'us-east-1';
process.env.RECIPES_TABLE_NAME = 'recipe-app-all-resources';

require('dotenv').config();

async function testSingleRecipe() {
  console.log('🧪 Testing Single Recipe Creation');
  console.log('=================================');
  
  try {
    const { createRecipe } = require('./models/Recipe');
    
    const testRecipe = {
      name: 'Test Masala Dosa',
      description: 'A test version of the classic South Indian crepe',
      ingredients: [
        '2 cups dosa batter',
        '4 medium potatoes, boiled and cubed',
        '1 large onion, sliced',
        '2 green chilies, slit',
        'Salt to taste',
        '2 tbsp oil'
      ],
      instructions: '1. Heat oil in a pan\n2. Add onions and cook until golden\n3. Add potatoes and spices\n4. Make dosa and add filling\n5. Serve hot',
      cookingTime: 45,
      servings: 4,
      difficulty: 'Medium',
      category: 'South Indian',
      tags: ['breakfast', 'south indian', 'dosa', 'vegetarian'],
      isPublic: true,
      authorId: 'test-user',
      authorName: 'Test User',
      nutritionalInfo: {
        calories: 280,
        carbs: '45g',
        protein: '8g',
        fat: '8g'
      }
    };
    
    console.log('📝 Creating test recipe...');
    const createdRecipe = await createRecipe(testRecipe);
    console.log('✅ Success! Recipe created with ID:', createdRecipe.recipeId);
    
    // Test fetching the recipe
    console.log('📖 Testing recipe retrieval...');
    const { getRecipeById } = require('./models/Recipe');
    const retrievedRecipe = await getRecipeById(createdRecipe.recipeId);
    console.log('✅ Recipe retrieved successfully:', retrievedRecipe.name);
    
    // Clean up
    console.log('🧹 Cleaning up test recipe...');
    const { deleteRecipeById } = require('./models/Recipe');
    await deleteRecipeById(createdRecipe.recipeId, 'test-user');
    console.log('✅ Test recipe deleted');
    
    console.log('');
    console.log('🎉 All tests passed! Recipe creation is working correctly.');
    console.log('💡 You can now run the full import script.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    console.log('');
    console.log('🔧 This suggests there might be an issue with:');
    console.log('   - DynamoDB Local connection');
    console.log('   - Table structure');
    console.log('   - AWS SDK configuration');
  }
}

testSingleRecipe();