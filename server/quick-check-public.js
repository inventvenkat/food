// Quick check for public recipes
require('dotenv').config();

async function quickCheck() {
  console.log('🔍 Quick Public Recipes Check');
  console.log('=============================');
  
  try {
    const { getPublicRecipes } = require('./models/Recipe');
    
    console.log('📖 Fetching public recipes...');
    const result = await getPublicRecipes(100); // Get up to 100 recipes
    const recipes = result.recipes || [];
    
    console.log(`✅ Found ${recipes.length} public recipes total`);
    
    // Look for Indian recipes
    const indianRecipes = recipes.filter(recipe => 
      recipe.category === 'South Indian' || 
      recipe.category === 'North Indian' ||
      (recipe.authorId && recipe.authorId.includes('indian')) ||
      (recipe.name && recipe.name.toLowerCase().includes('masala')) ||
      (recipe.name && recipe.name.toLowerCase().includes('dal')) ||
      (recipe.name && recipe.name.toLowerCase().includes('dosa'))
    );
    
    console.log(`🇮🇳 Found ${indianRecipes.length} Indian recipes:`);
    indianRecipes.forEach((recipe, index) => {
      console.log(`   ${index + 1}. ${recipe.name} (${recipe.category || 'No category'})`);
      console.log(`      - Public: ${recipe.isPublic}`);
      console.log(`      - Author: ${recipe.authorId || recipe.authorName}`);
      console.log(`      - Tags: ${recipe.tags ? recipe.tags.join(', ') : 'None'}`);
      console.log('');
    });
    
    if (indianRecipes.length === 0) {
      console.log('❌ No Indian recipes found in public recipes!');
      console.log('');
      console.log('🔧 Possible issues:');
      console.log('   1. Recipes not marked as public (isPublic: false)');
      console.log('   2. Recipes not indexed in GSI2 (public recipes index)');
      console.log('   3. Import script created them with wrong format');
      console.log('');
      console.log('💡 Let\'s check all recipes with "system" author:');
      
      const systemRecipes = recipes.filter(recipe => 
        recipe.authorId && (
          recipe.authorId.includes('system') || 
          recipe.authorName && recipe.authorName.toLowerCase().includes('system')
        )
      );
      
      console.log(`   Found ${systemRecipes.length} system recipes:`);
      systemRecipes.forEach(recipe => {
        console.log(`   - ${recipe.name} (${recipe.category})`);
      });
    } else {
      console.log('✅ Indian recipes found! They should appear in the app.');
      console.log('');
      console.log('🌐 Test the API endpoint:');
      console.log('   curl "http://localhost:3001/api/recipes/public?limit=100"');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

quickCheck();