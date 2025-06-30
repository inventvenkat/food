#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple test of the recipe import workflow without authentication
console.log('🧪 Testing Recipe Import Workflow...');
console.log('=====================================');

// 1. Test reading recipe files
const sampleDir = './sample-recipes';
console.log(`📁 Reading files from ${sampleDir}...`);

if (!fs.existsSync(sampleDir)) {
  console.log('❌ Sample recipes directory not found');
  process.exit(1);
}

const files = fs.readdirSync(sampleDir);
const recipeFiles = files.filter(file => {
  const ext = path.extname(file).toLowerCase();
  return ['.txt', '.md', '.recipe'].includes(ext);
});

console.log(`✅ Found ${recipeFiles.length} recipe files:`);
recipeFiles.forEach(file => {
  console.log(`   📄 ${file}`);
});

// 2. Test reading file contents
console.log('\n📖 Reading file contents...');
recipeFiles.forEach(file => {
  const content = fs.readFileSync(path.join(sampleDir, file), 'utf8');
  const lines = content.split('\n').length;
  const chars = content.length;
  console.log(`   📄 ${file}: ${lines} lines, ${chars} characters`);
});

// 3. Show what would be sent to ChatGPT
const firstFile = recipeFiles[0];
if (firstFile) {
  const content = fs.readFileSync(path.join(sampleDir, firstFile), 'utf8');
  console.log(`\n🤖 Sample ChatGPT prompt for ${firstFile}:`);
  console.log('---'.repeat(20));
  console.log(`Recipe text:\n"""\n${content.substring(0, 200)}...\n"""`);
  console.log('---'.repeat(20));
}

console.log('\n✅ Import workflow test completed!');
console.log('\n💡 Next steps:');
console.log('1. Set OPENAI_API_KEY environment variable');
console.log('2. Ensure your server is running with DynamoDB');
console.log('3. Run: node scripts/chatgpt-recipe-importer.js ../sample-recipes');