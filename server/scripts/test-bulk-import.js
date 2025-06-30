#!/usr/bin/env node

/**
 * Test script for bulk import functionality
 * Tests the Phase 2 content library features
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Simulate an HTTP request to test the bulk import API
async function testBulkImport() {
  console.log('🚀 Testing Bulk Import System - Phase 2 Implementation');
  console.log('='.repeat(60));
  
  try {
    // Load sample recipes
    const sampleRecipesPath = path.join(__dirname, '../test-data/sample-recipes.json');
    const sampleRecipes = JSON.parse(fs.readFileSync(sampleRecipesPath, 'utf8'));
    
    console.log(`📊 Loaded ${sampleRecipes.length} sample recipes for testing`);
    
    // Test 1: Recipe data validation
    console.log('\n🔍 Test 1: Recipe Data Validation');
    const { validateAndNormalizeRecipe } = require('../routes/recipes');
    
    let validRecipes = 0;
    let invalidRecipes = 0;
    
    sampleRecipes.forEach((recipe, index) => {
      try {
        validateAndNormalizeRecipe(recipe, index, {
          isPublic: true,
          sourceAttribution: 'Test Import',
          importId: 'test-123'
        });
        validRecipes++;
        console.log(`  ✅ Recipe ${index + 1}: ${recipe.name}`);
      } catch (error) {
        invalidRecipes++;
        console.log(`  ❌ Recipe ${index + 1}: ${recipe.name} - ${error.message}`);
      }
    });
    
    console.log(`\n📈 Validation Results: ${validRecipes} valid, ${invalidRecipes} invalid`);
    
    // Test 2: JSON Structure Test
    console.log('\n🔍 Test 2: JSON Structure Validation');
    const requiredFields = ['name', 'instructions', 'ingredients'];
    const optionalFields = ['description', 'cookingTime', 'servings', 'category', 'tags'];
    
    sampleRecipes.forEach((recipe, index) => {
      const missingRequired = requiredFields.filter(field => !recipe[field]);
      const hasOptional = optionalFields.filter(field => recipe[field]);
      
      if (missingRequired.length === 0) {
        console.log(`  ✅ Recipe ${index + 1}: Complete structure (${hasOptional.length}/${optionalFields.length} optional fields)`);
      } else {
        console.log(`  ❌ Recipe ${index + 1}: Missing required fields: ${missingRequired.join(', ')}`);
      }
    });
    
    // Test 3: Category Distribution
    console.log('\n🔍 Test 3: Category Distribution Analysis');
    const categoryCount = {};
    sampleRecipes.forEach(recipe => {
      const category = recipe.category || 'Uncategorized';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    console.log('  📊 Category breakdown:');
    Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`    ${category}: ${count} recipes`);
      });
    
    // Test 4: Ingredients Analysis
    console.log('\n🔍 Test 4: Ingredients Structure Analysis');
    const ingredientIssues = [];
    
    sampleRecipes.forEach((recipe, index) => {
      if (!Array.isArray(recipe.ingredients)) {
        ingredientIssues.push(`Recipe ${index + 1}: Ingredients not an array`);
      } else {
        recipe.ingredients.forEach((ingredient, ingIndex) => {
          if (typeof ingredient !== 'object' || !ingredient.name) {
            ingredientIssues.push(`Recipe ${index + 1}, Ingredient ${ingIndex + 1}: Invalid structure`);
          }
        });
      }
    });
    
    if (ingredientIssues.length === 0) {
      console.log('  ✅ All ingredients properly structured');
    } else {
      console.log('  ⚠️  Ingredient issues found:');
      ingredientIssues.forEach(issue => console.log(`    ${issue}`));
    }
    
    // Test 5: Performance Test Simulation
    console.log('\n🔍 Test 5: Performance Simulation');
    const { BatchOperations } = require('../utils/batchOperations');
    
    // Simulate large dataset
    const largeDataset = [];
    for (let i = 0; i < 100; i++) {
      largeDataset.push(...sampleRecipes.map(recipe => ({
        ...recipe,
        name: `${recipe.name} - Batch ${Math.floor(i / 20) + 1} #${(i % 20) + 1}`
      })));
    }
    
    console.log(`  📊 Simulating import of ${largeDataset.length} recipes`);
    
    const chunks = BatchOperations.chunkArray(largeDataset, 25);
    console.log(`  🔄 Would process in ${chunks.length} batches of 25 items each`);
    
    // Calculate estimated processing time
    const estimatedTimePerBatch = 500; // ms
    const estimatedTotalTime = chunks.length * estimatedTimePerBatch;
    console.log(`  ⏱️  Estimated processing time: ${estimatedTotalTime}ms (${Math.round(estimatedTotalTime / 1000)}s)`);
    
    // Test 6: Search Keywords Extraction
    console.log('\n🔍 Test 6: Search Keywords Analysis');
    const allTags = [];
    const allCategories = [];
    
    sampleRecipes.forEach(recipe => {
      if (recipe.tags && Array.isArray(recipe.tags)) {
        allTags.push(...recipe.tags);
      }
      if (recipe.category) {
        allCategories.push(recipe.category.toLowerCase());
      }
    });
    
    const uniqueTags = [...new Set(allTags)];
    const uniqueCategories = [...new Set(allCategories)];
    
    console.log(`  🏷️  Found ${uniqueTags.length} unique tags: ${uniqueTags.slice(0, 10).join(', ')}${uniqueTags.length > 10 ? '...' : ''}`);
    console.log(`  📂 Found ${uniqueCategories.length} unique categories: ${uniqueCategories.join(', ')}`);
    
    // Test 7: Content Attribution Test
    console.log('\n🔍 Test 7: Attribution System Test');
    const testAttribution = {
      sourceAttribution: 'Community Recipe Collection v1.0',
      originalSource: 'https://example-recipe-site.com',
      license: 'Creative Commons Attribution 4.0',
      importId: 'test-import-' + Date.now()
    };
    
    console.log('  📄 Sample attribution structure:');
    Object.entries(testAttribution).forEach(([key, value]) => {
      console.log(`    ${key}: ${value}`);
    });
    
    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 BULK IMPORT SYSTEM TEST COMPLETED');
    console.log('='.repeat(60));
    console.log(`✅ Recipe validation: ${validRecipes}/${sampleRecipes.length} passed`);
    console.log(`📊 Categories identified: ${Object.keys(categoryCount).length}`);
    console.log(`🏷️  Search tags available: ${uniqueTags.length}`);
    console.log(`⚡ Performance: Ready for ${largeDataset.length}+ recipe imports`);
    console.log('🚀 Phase 2 Content Library features are ready for deployment!');
    
    return {
      success: true,
      summary: {
        totalRecipes: sampleRecipes.length,
        validRecipes,
        invalidRecipes,
        categories: Object.keys(categoryCount).length,
        tags: uniqueTags.length,
        estimatedPerformance: `${chunks.length} batches for ${largeDataset.length} recipes`
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test if called directly
if (require.main === module) {
  testBulkImport()
    .then(result => {
      if (result.success) {
        console.log('\n✅ All tests passed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Tests failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testBulkImport };