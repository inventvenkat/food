#!/usr/bin/env node

// Test script to verify DynamoDB connection
require('dotenv').config();

const { docClient } = require('./config/db');
const { ListTablesCommand } = require('@aws-sdk/client-dynamodb');

async function testDynamoDBConnection() {
  console.log('🧪 Testing DynamoDB Connection...');
  console.log('=================================');
  
  console.log('Environment Variables:');
  console.log(`  DYNAMODB_ENDPOINT_OVERRIDE: ${process.env.DYNAMODB_ENDPOINT_OVERRIDE}`);
  console.log(`  AWS_REGION: ${process.env.AWS_REGION}`);
  console.log(`  AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID}`);
  console.log('');

  try {
    console.log('📡 Attempting to list DynamoDB tables...');
    
    // Test connection by listing tables
    const { getDynamoClient } = require('./config/db');
    const dynamoClient = getDynamoClient();
    
    const command = new ListTablesCommand({});
    const response = await dynamoClient.send(command);
    
    console.log('✅ DynamoDB connection successful!');
    console.log(`📋 Found ${response.TableNames.length} tables:`);
    response.TableNames.forEach(tableName => {
      console.log(`   - ${tableName}`);
    });

    // Test a simple query
    if (response.TableNames.length > 0) {
      console.log('\n🔍 Testing recipe query...');
      const { getPublicRecipes } = require('./models/Recipe');
      
      try {
        const result = await getPublicRecipes(5);
        console.log(`✅ Recipe query successful! Found ${result.recipes.length} recipes`);
        if (result.recipes.length > 0) {
          console.log('   Sample recipes:');
          result.recipes.slice(0, 3).forEach((recipe, idx) => {
            console.log(`   ${idx + 1}. ${recipe.name} (${recipe.category || 'No category'})`);
          });
        }
      } catch (recipeError) {
        console.log('❌ Recipe query failed:', recipeError.message);
      }
    }

  } catch (error) {
    console.log('❌ DynamoDB connection failed!');
    console.log('Error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Check if DynamoDB Local is running:');
    console.log('   docker run -p 8000:8000 amazon/dynamodb-local');
    console.log('2. Or start with docker-compose:');
    console.log('   docker-compose up dynamodb-local');
    console.log('3. Verify port 8000 is accessible:');
    console.log('   curl http://localhost:8000');
    console.log('4. Check environment variables in .env file');
  }
}

testDynamoDBConnection();