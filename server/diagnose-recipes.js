// Diagnose what's actually stored in the database
require('dotenv').config();

const { docClient } = require('./config/db');
const { ScanCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

async function diagnoseRecipes() {
  console.log('🔍 Diagnosing Recipe Storage');
  console.log('============================');
  
  try {
    const RECIPES_TABLE_NAME = process.env.RECIPES_TABLE_NAME || 'recipe-app-all-resources';
    
    // 1. Scan for all recipes (up to 100)
    console.log('1️⃣ Scanning for all recipes...');
    const scanParams = {
      TableName: RECIPES_TABLE_NAME,
      FilterExpression: "begins_with(PK, :pk_prefix)",
      ExpressionAttributeValues: {
        ":pk_prefix": "RECIPE#"
      },
      Limit: 100
    };
    
    const scanResult = await docClient.send(new ScanCommand(scanParams));
    const allRecipes = scanResult.Items || [];
    console.log(`   Found ${allRecipes.length} total recipes`);
    
    // 2. Look for Indian recipes
    console.log('2️⃣ Looking for Indian recipes...');
    const indianRecipes = allRecipes.filter(recipe => 
      recipe.category === 'South Indian' || 
      recipe.category === 'North Indian' ||
      (recipe.name && (
        recipe.name.includes('Masala') || 
        recipe.name.includes('Dal') || 
        recipe.name.includes('Dosa') ||
        recipe.name.includes('Biryani') ||
        recipe.name.includes('Paneer')
      )) ||
      (recipe.authorId && recipe.authorId.includes('system'))
    );
    
    console.log(`   Found ${indianRecipes.length} Indian recipes:`);
    indianRecipes.forEach((recipe, index) => {
      console.log(`   ${index + 1}. ${recipe.name}`);
      console.log(`      - isPublic: ${recipe.isPublic}`);
      console.log(`      - GSI2PK: ${recipe.GSI2PK || 'MISSING!'}`);
      console.log(`      - GSI2SK: ${recipe.GSI2SK || 'MISSING!'}`);
      console.log(`      - Category: ${recipe.category}`);
      console.log(`      - Author: ${recipe.authorId || recipe.authorName}`);
      console.log('');
    });
    
    // 3. Test GSI2 query directly
    console.log('3️⃣ Testing GSI2 query for public recipes...');
    const gsi2Params = {
      TableName: RECIPES_TABLE_NAME,
      IndexName: 'GSI2PK-GSI2SK-index',
      KeyConditionExpression: "GSI2PK = :gsi2pk",
      ExpressionAttributeValues: {
        ":gsi2pk": "PUBLIC#TRUE"
      },
      Limit: 50
    };
    
    try {
      const gsi2Result = await docClient.send(new QueryCommand(gsi2Params));
      const publicRecipes = gsi2Result.Items || [];
      console.log(`   ✅ GSI2 query found ${publicRecipes.length} public recipes`);
      
      const publicIndianRecipes = publicRecipes.filter(recipe =>
        recipe.category === 'South Indian' || recipe.category === 'North Indian'
      );
      console.log(`   🇮🇳 ${publicIndianRecipes.length} of them are Indian recipes`);
      
    } catch (gsi2Error) {
      console.error(`   ❌ GSI2 query failed: ${gsi2Error.message}`);
    }
    
    // 4. Show recommendations
    console.log('4️⃣ Recommendations:');
    if (indianRecipes.length === 0) {
      console.log('   ❌ No Indian recipes found - import failed completely');
      console.log('   💡 Re-run: node scripts/simple-indian-import.js');
    } else if (indianRecipes.some(r => r.isPublic !== true)) {
      console.log('   ⚠️  Some Indian recipes are not marked as public');
      console.log('   💡 Fix with update script');
    } else if (indianRecipes.some(r => !r.GSI2PK || r.GSI2PK !== 'PUBLIC#TRUE')) {
      console.log('   ⚠️  GSI2 indexing is broken');
      console.log('   💡 Need to re-import or fix GSI attributes');
    } else {
      console.log('   ✅ Indian recipes look correctly stored');
      console.log('   💡 Issue might be in the API or frontend');
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

diagnoseRecipes();