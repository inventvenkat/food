#!/usr/bin/env node

// Simple test script to check if Discover page pagination is working correctly

const fetch = require('node-fetch');

async function testDiscoverPagination() {
  console.log('🧪 Testing Discover Page Pagination...');
  console.log('=====================================');

  try {
    // Test 1: Fetch first page of recipes (same as Discover page)
    console.log('📄 Testing recipes pagination (Discover page format)...');
    const response1 = await fetch('http://localhost:3001/api/recipes/public?limit=9');
    const data1 = await response1.json();
    console.log(`✅ First page: ${data1.recipes.length} recipes`);
    console.log(`   Next pagination key: ${data1.nextLek ? 'Available' : 'None'}`);
    
    if (data1.recipes.length > 0) {
      console.log(`   Sample recipe: "${data1.recipes[0].name}"`);
    }

    // Test 2: Fetch large limit (same as Meal Planner)
    console.log('\n📄 Testing recipes with large limit (Meal Planner format)...');
    const response2 = await fetch('http://localhost:3001/api/recipes/public?limit=200');
    const data2 = await response2.json();
    console.log(`✅ Large limit: ${data2.recipes.length} recipes`);
    
    if (data2.recipes.length > 0) {
      console.log(`   Sample recipe: "${data2.recipes[0].name}"`);
    }

    // Test 3: Compare results
    console.log('\n🔍 Comparison:');
    console.log(`   Discover format: ${data1.recipes.length} recipes`);
    console.log(`   Meal Planner format: ${data2.recipes.length} recipes`);
    
    if (data2.recipes.length > data1.recipes.length) {
      console.log('✅ Meal Planner gets more recipes - pagination issue confirmed');
      console.log('   First few recipes from Meal Planner format:');
      data2.recipes.slice(0, 5).forEach((recipe, idx) => {
        console.log(`   ${idx + 1}. ${recipe.name} (${recipe.category || 'No category'})`);
      });
    } else {
      console.log('ℹ️  Both formats return same number of recipes');
    }

    // Test 4: Check for recipes that might be missing
    if (data2.recipes.length > 9) {
      console.log('\n🔍 Recipes that might be missing from Discover page:');
      const missingRecipes = data2.recipes.slice(9, 15); // Show recipes 10-15
      missingRecipes.forEach((recipe, idx) => {
        console.log(`   ${idx + 10}. ${recipe.name} (${recipe.category || 'No category'})`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDiscoverPagination();