// Manual test to verify public recipes functionality
require('dotenv').config();

async function manualTest() {
  console.log('🧪 Manual Public Recipes Test');
  console.log('=============================');
  
  try {
    // Test the exact function used by the API
    const { getPublicRecipes } = require('./models/Recipe');
    
    console.log('1️⃣ Testing getPublicRecipes function...');
    const result = await getPublicRecipes(50);
    console.log(`   Found ${result.recipes.length} public recipes`);
    
    // Look for Indian recipes specifically
    const indianRecipes = result.recipes.filter(recipe => 
      recipe.category === 'South Indian' || 
      recipe.category === 'North Indian' ||
      recipe.name?.toLowerCase().includes('masala') ||
      recipe.name?.toLowerCase().includes('dal') ||
      recipe.name?.toLowerCase().includes('dosa')
    );
    
    console.log(`   🇮🇳 ${indianRecipes.length} Indian recipes found:`);
    indianRecipes.forEach((recipe, index) => {
      console.log(`      ${index + 1}. ${recipe.name} (${recipe.category})`);
    });
    
    if (indianRecipes.length === 0) {
      console.log('');
      console.log('❌ No Indian recipes found in public API');
      console.log('💡 Let\'s check all recipes in database...');
      
      // Direct database scan
      const { docClient } = require('./config/db');
      const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
      
      const scanParams = {
        TableName: process.env.RECIPES_TABLE_NAME || 'recipe-app-all-resources',
        FilterExpression: "begins_with(PK, :pk_prefix)",
        ExpressionAttributeValues: {
          ":pk_prefix": "RECIPE#"
        },
        Limit: 50
      };
      
      const scanResult = await docClient.send(new ScanCommand(scanParams));
      const allRecipes = scanResult.Items || [];
      
      const allIndianRecipes = allRecipes.filter(recipe => 
        recipe.category === 'South Indian' || 
        recipe.category === 'North Indian' ||
        recipe.name?.toLowerCase().includes('masala')
      );
      
      console.log(`   📊 Total recipes in database: ${allRecipes.length}`);
      console.log(`   🇮🇳 Indian recipes in database: ${allIndianRecipes.length}`);
      
      if (allIndianRecipes.length > 0) {
        console.log('   📝 First Indian recipe details:');
        const first = allIndianRecipes[0];
        console.log(`      Name: ${first.name}`);
        console.log(`      isPublic: ${first.isPublic}`);
        console.log(`      GSI2PK: ${first.GSI2PK}`);
        console.log(`      GSI2SK: ${first.GSI2SK}`);
        
        if (!first.isPublic || first.GSI2PK !== 'PUBLIC#TRUE') {
          console.log('   🔧 Recipe needs to be fixed for public access');
        }
      }
    } else {
      console.log('');
      console.log('✅ Indian recipes found! Testing API endpoint...');
      
      // Test API endpoint
      const http = require('http');
      const req = http.request({
        hostname: 'localhost',
        port: 3002,
        path: '/api/recipes/public?limit=50',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const apiResponse = JSON.parse(data);
            const apiIndianRecipes = apiResponse.recipes?.filter(r =>
              r.category === 'South Indian' || r.category === 'North Indian'
            ) || [];
            console.log(`   🌐 API returned ${apiIndianRecipes.length} Indian recipes`);
            
            if (apiIndianRecipes.length === 0) {
              console.log('   ❌ API not returning Indian recipes despite database having them');
            } else {
              console.log('   ✅ API is working correctly!');
            }
          } catch (e) {
            console.log(`   ❌ API returned invalid JSON: ${data}`);
          }
        });
      });
      
      req.on('error', (error) => {
        console.log(`   ❌ API request failed: ${error.message}`);
      });
      
      req.end();
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

manualTest();