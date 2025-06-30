// Load environment variables
require('dotenv').config();

const { getAllPublicRecipes } = require('./models/Recipe');

async function validateSetup() {
  console.log('🔍 Validating Recipe App Setup');
  console.log('=============================');
  
  try {
    // Test DynamoDB connection
    const { getDynamoClient } = require('./config/db');
    const { ListTablesCommand } = require("@aws-sdk/client-dynamodb");
    
    console.log('1️⃣ Testing DynamoDB connection...');
    const client = getDynamoClient();
    const result = await client.send(new ListTablesCommand({}));
    console.log(`   ✅ Connected! Tables: ${result.TableNames.join(', ')}`);
    
    // Check for recipes
    console.log('2️⃣ Checking recipe database...');
    const publicRecipes = await getAllPublicRecipes(100);
    console.log(`   ✅ Found ${publicRecipes.length} public recipes`);
    
    // Check for Indian recipes
    console.log('3️⃣ Looking for Indian recipes...');
    const indianRecipes = publicRecipes.filter(recipe => 
      recipe.category === 'South Indian' || 
      recipe.category === 'North Indian' ||
      recipe.tags?.some(tag => tag.toLowerCase().includes('indian'))
    );
    
    console.log(`   ✅ Found ${indianRecipes.length} Indian recipes:`);
    indianRecipes.forEach(recipe => {
      console.log(`      - ${recipe.name} (${recipe.category})`);
    });
    
    if (indianRecipes.length === 0) {
      console.log('');
      console.log('❌ No Indian recipes found!');
      console.log('💡 Run the import script:');
      console.log('   ./import-recipes.sh');
      console.log('   OR');
      console.log('   node scripts/import-indian-recipes.js');
    } else if (indianRecipes.length < 15) {
      console.log('');
      console.log('⚠️  Only partial Indian recipe set found');
      console.log('💡 Expected 15 recipes, found', indianRecipes.length);
      console.log('   You may want to re-run the import script');
    } else {
      console.log('');
      console.log('🎉 Perfect! All Indian recipes are imported');
      console.log('✨ Your meal planner is ready for Indian cuisine!');
    }
    
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Start the application: npm start (in server and client)');
    console.log('   2. Go to http://localhost:3000/meal-planner');
    console.log('   3. Click on a date and add Indian recipes to your meal plan');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.error('');
    console.error('🔧 Common fixes:');
    console.error('   1. Start DynamoDB Local: docker compose up -d dynamodb-local');
    console.error('   2. Initialize tables: node config/init-dynamodb.js');
    console.error('   3. Check environment variables in .env file');
  }
}

validateSetup();