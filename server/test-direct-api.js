// Test the public recipes API directly without cache
require('dotenv').config();

const express = require('express');
const { docClient } = require('./config/db');
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");

const app = express();

// Direct public recipes endpoint (no cache)
app.get('/api/recipes/public-direct', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  console.log('🔍 Direct public recipes query (no cache)');
  
  const params = {
    TableName: process.env.RECIPES_TABLE_NAME || 'recipe-app-all-resources',
    IndexName: 'GSI2PK-GSI2SK-index',
    KeyConditionExpression: "GSI2PK = :gsi2pk",
    ExpressionAttributeValues: {
      ":gsi2pk": "PUBLIC#TRUE",
    },
    ScanIndexForward: false,
    Limit: limit,
  };
  
  try {
    console.log('📊 Query params:', JSON.stringify(params, null, 2));
    const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));
    console.log(`✅ Found ${Items.length} items`);
    
    const recipes = Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...recipe } = item;
      return recipe;
    });
    
    const indianRecipes = recipes.filter(r => 
      r.category === 'South Indian' || r.category === 'North Indian'
    );
    console.log(`🇮🇳 ${indianRecipes.length} Indian recipes found`);
    
    res.json({
      recipes,
      nextLek: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
      debug: {
        totalFound: Items.length,
        indianFound: indianRecipes.length,
        queryParams: params
      }
    });
  } catch (err) {
    console.error('❌ Error fetching public recipes:', err.message);
    res.status(500).json({ error: err.message, params });
  }
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`🧪 Direct API test server running on http://localhost:${PORT}`);
  console.log(`🔗 Test: curl "http://localhost:${PORT}/api/recipes/public-direct?limit=50"`);
});