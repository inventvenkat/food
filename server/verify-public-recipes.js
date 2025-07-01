// Verify public recipes are properly stored and accessible
require('dotenv').config();

async function verifyPublicRecipes() {
  console.log('🔍 Verifying Public Recipes');
  console.log('===========================');
  
  try {
    const { getAllPublicRecipes, getRecipesByCategory } = require('./models/Recipe');
    
    // 1. Check all public recipes
    console.log('1️⃣ Fetching all public recipes...');
    const allPublicRecipes = await getAllPublicRecipes(100);
    console.log(`   Found ${allPublicRecipes.length} total public recipes`);
    
    // 2. Filter for Indian recipes
    console.log('2️⃣ Looking for Indian recipes...');
    const indianRecipes = allPublicRecipes.filter(recipe => 
      recipe.category === 'South Indian' || 
      recipe.category === 'North Indian' ||
      recipe.tags?.some(tag => tag.toLowerCase().includes('indian')) ||
      recipe.authorId === 'system-indian-recipes'
    );
    
    console.log(`   Found ${indianRecipes.length} Indian recipes:`);
    indianRecipes.forEach((recipe, index) => {
      console.log(`   ${index + 1}. ${recipe.name} (${recipe.category}) - Public: ${recipe.isPublic}`);
    });
    
    // 3. Check specific categories
    console.log('3️⃣ Checking by category...');
    try {
      const southIndianRecipes = await getRecipesByCategory('South Indian', 50);
      console.log(`   South Indian recipes: ${southIndianRecipes.length}`);
      
      const northIndianRecipes = await getRecipesByCategory('North Indian', 50);
      console.log(`   North Indian recipes: ${northIndianRecipes.length}`);
    } catch (catError) {
      console.log('   Category search not available or failed:', catError.message);
    }
    
    // 4. Check API endpoint
    console.log('4️⃣ Testing public recipes API endpoint...');
    const http = require('http');
    
    const testAPIEndpoint = () => {
      return new Promise((resolve) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3001,
          path: '/api/recipes/public?limit=100',
          method: 'GET',
          timeout: 5000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              resolve({ success: true, data: response });
            } catch (e) {
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          });
        });
        
        req.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });
        
        req.on('timeout', () => {
          resolve({ success: false, error: 'Request timeout' });
        });
        
        req.end();
      });
    };
    
    const apiResult = await testAPIEndpoint();
    if (apiResult.success) {
      const apiIndianRecipes = apiResult.data.recipes?.filter(recipe => 
        recipe.category === 'South Indian' || 
        recipe.category === 'North Indian'
      ) || [];
      console.log(`   ✅ API endpoint working! Found ${apiIndianRecipes.length} Indian recipes via API`);
    } else {
      console.log(`   ❌ API endpoint failed: ${apiResult.error}`);
      console.log('   💡 Make sure your server is running on port 3001');
    }
    
    // 5. Recommendations
    console.log('');
    console.log('📋 Summary:');
    if (indianRecipes.length === 0) {
      console.log('❌ No Indian recipes found in database');
      console.log('💡 Try running the import script again:');
      console.log('   node scripts/simple-indian-import.js');
    } else if (indianRecipes.length < 15) {
      console.log(`⚠️  Only ${indianRecipes.length}/15 Indian recipes found`);
      console.log('💡 Some recipes may not have imported correctly');
    } else {
      console.log('✅ All Indian recipes found in database');
      
      if (apiResult.success && apiResult.data.recipes) {
        const apiIndianCount = apiResult.data.recipes.filter(r => 
          r.category === 'South Indian' || r.category === 'North Indian'
        ).length;
        
        if (apiIndianCount === 0) {
          console.log('❌ But they are not accessible via the public API');
          console.log('🔧 Check the public recipes route in your server');
        } else if (apiIndianCount < indianRecipes.length) {
          console.log(`⚠️  Only ${apiIndianCount}/${indianRecipes.length} visible via API`);
          console.log('🔧 Some recipes may not be properly marked as public');
        } else {
          console.log('✅ All recipes accessible via public API');
          console.log('');
          console.log('🎉 Everything looks good! Indian recipes should appear in:');
          console.log('   - Discover page: http://localhost:3000/discover');
          console.log('   - Meal planner recipe dropdown');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

verifyPublicRecipes();