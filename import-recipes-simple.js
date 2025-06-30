#!/usr/bin/env node

const path = require('path');
const { importIndianRecipes } = require('./server/scripts/import-indian-recipes');

console.log('🇮🇳 Simple Indian Recipes Import');
console.log('================================');
console.log('');
console.log('⚠️  PREREQUISITES:');
console.log('   1. DynamoDB Local must be running on http://localhost:8000');
console.log('   2. Tables must be initialized');
console.log('');
console.log('💡 To start DynamoDB Local:');
console.log('   docker run -p 8000:8000 amazon/dynamodb-local');
console.log('   OR');
console.log('   docker compose up -d dynamodb-local');
console.log('');
console.log('🏗️  To initialize tables:');
console.log('   cd server && node config/init-dynamodb.js');
console.log('');

// Check if DynamoDB Local is running
const http = require('http');

const checkDynamoDBLocal = () => {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      resolve(false);
    });
    
    req.end();
  });
};

async function main() {
  console.log('🔍 Checking DynamoDB Local connection...');
  
  const isRunning = await checkDynamoDBLocal();
  
  if (!isRunning) {
    console.error('❌ DynamoDB Local is not running on http://localhost:8000');
    console.error('');
    console.error('Please start DynamoDB Local first:');
    console.error('   docker run -p 8000:8000 amazon/dynamodb-local');
    console.error('   OR');
    console.error('   docker compose up -d dynamodb-local');
    process.exit(1);
  }
  
  console.log('✅ DynamoDB Local is running');
  console.log('');
  
  try {
    await importIndianRecipes();
    console.log('');
    console.log('🎉 Import completed successfully!');
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    process.exit(1);
  }
}

main();