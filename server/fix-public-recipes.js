// Fix existing recipes to be properly marked as public
require('dotenv').config();

const { docClient } = require('./config/db');
const { ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

async function fixPublicRecipes() {
  console.log('🔧 Fixing Public Recipe Indexing');
  console.log('=================================');
  
  try {
    const RECIPES_TABLE_NAME = process.env.RECIPES_TABLE_NAME || 'recipe-app-all-resources';
    
    // 1. Find Indian recipes that might need fixing
    console.log('1️⃣ Scanning for Indian recipes...');
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
    
    const indianRecipes = allRecipes.filter(recipe => 
      recipe.category === 'South Indian' || 
      recipe.category === 'North Indian' ||
      (recipe.authorId && recipe.authorId.includes('system')) ||
      (recipe.authorName && recipe.authorName.includes('Indian'))
    );
    
    console.log(`   Found ${indianRecipes.length} Indian recipes`);
    
    // 2. Check which ones need fixing
    const recipesToFix = indianRecipes.filter(recipe => 
      !recipe.isPublic || 
      !recipe.GSI2PK || 
      recipe.GSI2PK !== 'PUBLIC#TRUE'
    );
    
    console.log(`   ${recipesToFix.length} recipes need fixing`);
    
    if (recipesToFix.length === 0) {
      console.log('✅ All Indian recipes are already properly configured!');
      return;
    }
    
    // 3. Fix each recipe
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const recipe of recipesToFix) {
      try {
        console.log(`🔧 Fixing: ${recipe.name}`);
        
        const updateParams = {
          TableName: RECIPES_TABLE_NAME,
          Key: {
            PK: recipe.PK,
            SK: recipe.SK
          },
          UpdateExpression: "SET isPublic = :isPublic, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":isPublic": true,
            ":gsi2pk": "PUBLIC#TRUE",
            ":gsi2sk": `CREATEDAT#${recipe.createdAt || new Date().toISOString()}`,
            ":updatedAt": new Date().toISOString()
          }
        };
        
        await docClient.send(new UpdateCommand(updateParams));
        console.log(`   ✅ Fixed: ${recipe.name}`);
        fixedCount++;
        
        // Small delay to avoid overwhelming DynamoDB
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ Failed to fix ${recipe.name}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('');
    console.log('📊 Fix Summary:');
    console.log(`✅ Successfully fixed: ${fixedCount} recipes`);
    console.log(`❌ Failed to fix: ${errorCount} recipes`);
    
    if (fixedCount > 0) {
      console.log('');
      console.log('🎉 Recipes have been fixed!');
      console.log('🧪 Test the public API:');
      console.log('   curl "http://localhost:3001/api/recipes/public?limit=100"');
      console.log('');
      console.log('🌐 Check in your app:');
      console.log('   - Discover page should show Indian recipes');
      console.log('   - Meal planner should have Indian recipes in dropdown');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixPublicRecipes();