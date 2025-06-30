const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createRecipe,
  getRecipeById,
  getRecipesByAuthor,
  getPublicRecipes,
  updateRecipe,
  deleteRecipe,
  // getRecipesByCategory, // Example, if you implement this in Recipe.js
  RECIPES_TABLE_NAME
} = require('../models/Recipe');
// const User = require('../models/User'); // No longer directly needed for populate if authorUsername is denormalized
// const MealPlan = require('../models/MealPlan'); // TODO: Refactor MealPlan model and cascade delete logic for DynamoDB

const multer = require('multer');
const { extractTextFromFile, customIngredientParser } = require('../utils/recipeParser');
const AIRecipeParser = require('../utils/aiRecipeParser');
const { v4: uuidv4 } = require('uuid');
const { BatchOperations } = require('../utils/batchOperations');

// Multer setup for recipe text extraction (remains the same)
const recipeUploadParser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt, .pdf, .doc, .docx are allowed.'), false);
    }
  }
});

// Multer setup for bulk import files
const bulkImportParser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for bulk imports
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/json', 'text/csv', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(json|csv|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .json, .csv, .txt are allowed for bulk imports.'), false);
    }
  }
});

// --- PUBLIC ROUTES ---

// @route   GET /api/recipes/public
// @desc    Get all public recipes (paginated)
// @access  Public
router.get('/public', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const lastEvaluatedKey = req.query.lek ? JSON.parse(decodeURIComponent(req.query.lek)) : null;

  try {
    // TODO: Implement total count for public recipes if needed. This can be complex/costly with DynamoDB.
    // For now, we are just getting a paginated list.
    const { recipes, lastEvaluatedKey: newLek } = await getPublicRecipes(limit, lastEvaluatedKey);

    res.json({
      recipes,
      // currentPage and totalPages are harder to calculate without a total count.
      // Sending nextLek for client to request next page.
      nextLek: newLek ? encodeURIComponent(JSON.stringify(newLek)) : null,
    });
  } catch (err) {
    console.error('Error fetching public recipes:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/recipes/public/:id
// @desc    Get a single public recipe by ID
// @access  Public
router.get('/public/:id', async (req, res) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    if (!recipe || !recipe.isPublic) {
      return res.status(404).json({ message: 'Public recipe not found or not public.' });
    }
    // User/author details are expected to be denormalized (e.g., authorUsername) or fetched separately if needed.
    res.json(recipe);
  } catch (err) {
    console.error('Error fetching public recipe by ID:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/recipes/featured
// @desc    Get featured public recipes and collections
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    // Get featured recipes (recently created public recipes with good ratings)
    const { recipes: featuredRecipes } = await getPublicRecipes(10);
    
    // Get featured collections
    const { getPublicRecipeCollections } = require('../models/RecipeCollection');
    const { collections: featuredCollections } = await getPublicRecipeCollections(5);
    
    // Filter for featured content
    const featured = {
      recipes: featuredRecipes.slice(0, 6),
      collections: featuredCollections.filter(c => c.isFeatured).slice(0, 4),
      categories: await getFeaturedCategories()
    };
    
    res.json(featured);
    
  } catch (error) {
    console.error('Error fetching featured content:', error.message);
    res.status(500).json({ message: 'Failed to load featured content' });
  }
});

// @route   GET /api/recipes/categories
// @desc    Get all recipe categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await getRecipeCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({ message: 'Failed to load categories' });
  }
});

// @route   GET /api/recipes/trending
// @desc    Get trending recipes based on recent activity
// @access  Public
router.get('/trending', async (req, res) => {
  const { limit = 10, timeframe = '7d' } = req.query;
  
  try {
    // For now, return recent public recipes
    // TODO: Implement proper trending algorithm based on views, ratings, etc.
    const { recipes } = await getPublicRecipes(parseInt(limit));
    
    res.json({
      recipes,
      timeframe,
      algorithm: 'recent_public' // Placeholder
    });
    
  } catch (error) {
    console.error('Error fetching trending recipes:', error.message);
    res.status(500).json({ message: 'Failed to load trending recipes' });
  }
});

// --- AUTHENTICATED ROUTES ---

// @route   POST /api/recipes
// @desc    Create a new recipe
// @access  Private
router.post('/', authMiddleware, (req, res) => {
  const uploadSingle = req.app.locals.upload.single('recipeImage'); // Multer instance from app.locals

  uploadSingle(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'Error uploading image.' });
    }

    const { name, description, cookingTime, servings, instructions, category, tags, ingredients: ingredientsJSON, isPublic } = req.body;

    // TODO: Add comprehensive input validation here (required fields, types, lengths, etc.)
    if (!name || !cookingTime || !servings || !instructions) {
      return res.status(400).json({ message: 'Please provide name, cooking time, servings, and instructions.' });
    }

    let ingredients = [];
    try {
      if (ingredientsJSON) ingredients = JSON.parse(ingredientsJSON);
    } catch (parseError) {
      return res.status(400).json({ message: 'Invalid ingredients JSON format.' });
    }

    let imageUrl = req.body.image; // Allows for providing an existing URL
    if (req.file) { // If a new image was uploaded
      imageUrl = `/uploads/recipe_images/${req.file.filename}`;
    }

    const recipeData = {
      name,
      description: description || '',
      cookingTime,
      servings: parseInt(servings, 10),
      instructions,
      image: imageUrl || '',
      category: category || '',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(tag => tag)) : [],
      ingredients,
      isPublic: isPublic === 'true' || isPublic === true,
    };

    try {
      const authorId = `USER#${req.user.id}`; // Construct full authorId for DynamoDB
      const authorUsername = req.user.username; // Get username from authMiddleware

      const newRecipe = await createRecipe({ recipeData, authorId, authorUsername });
      res.status(201).json(newRecipe);
    } catch (dbErr) {
      console.error('Error creating recipe:', dbErr.message);
      res.status(500).send('Server Error');
    }
  });
});

// @route   POST /api/recipes/upload-extract
// @desc    Upload a recipe file, extract text, and parse (this route's core logic doesn't change much)
// @access  Private
router.post('/upload-extract', authMiddleware, recipeUploadParser.single('recipeFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file type rejected.' });
  }
  try {
    const textContent = await extractTextFromFile(req.file);
    const parsedRecipeData = customIngredientParser(textContent);
    res.json(parsedRecipeData);
  } catch (error) {
    console.error('Error processing uploaded recipe file:', error.message);
    if (error.message.startsWith('Unsupported file type') || error.message.startsWith('Invalid file object') || error.message.includes('Could not extract text')) {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).send('Server Error during recipe file processing.');
  }
});

// @route   GET /api/recipes/ai-config
// @desc    Check AI configuration (debug endpoint)
// @access  Private
router.get('/ai-config', authMiddleware, async (req, res) => {
  const aiParser = new AIRecipeParser();
  res.json({
    provider: process.env.AI_PROVIDER || 'not set',
    hasXaiKey: !!process.env.XAI_API_KEY,
    xaiKeyPrefix: process.env.XAI_API_KEY ? process.env.XAI_API_KEY.substring(0, 8) + '...' : 'not set',
    model: process.env.XAI_MODEL || 'not set'
  });
});

// @route   POST /api/recipes/parse-with-ai
// @desc    Parse recipe text using local AI model (Ollama)
// @access  Private
router.post('/parse-with-ai', authMiddleware, async (req, res) => {
  const { recipeText } = req.body;

  if (!recipeText || typeof recipeText !== 'string' || recipeText.trim().length === 0) {
    return res.status(400).json({ 
      message: 'Recipe text is required and must be a non-empty string',
      fallback: true 
    });
  }

  const aiParser = new AIRecipeParser();
  
  try {
    // First, try AI parsing
    const aiParsedData = await aiParser.parseRecipeWithAI(recipeText);
    
    res.json({
      success: true,
      data: aiParsedData,
      source: 'ai',
      message: 'Recipe parsed successfully using AI'
    });

  } catch (aiError) {
    console.error('AI parsing failed:', aiError.message);
    
    // Fallback to rule-based parser
    try {
      const fallbackParsedData = customIngredientParser(recipeText);
      
      res.json({
        success: true,
        data: fallbackParsedData,
        source: 'fallback',
        message: 'AI parsing failed, used rule-based parser as fallback',
        aiError: aiError.message
      });

    } catch (fallbackError) {
      console.error('Both AI and fallback parsing failed:', fallbackError.message);
      
      res.status(500).json({
        success: false,
        message: 'Both AI and rule-based parsing failed',
        aiError: aiError.message,
        fallbackError: fallbackError.message
      });
    }
  }
});

// @route   GET /api/recipes
// @desc    Get all recipes for the logged-in user (paginated)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const lastEvaluatedKey = req.query.lek ? JSON.parse(decodeURIComponent(req.query.lek)) : null;
  const authorId = req.user.id; // From authMiddleware

  try {
    const { recipes, lastEvaluatedKey: newLek } = await getRecipesByAuthor(authorId, limit, lastEvaluatedKey);
    res.json({
      recipes,
      nextLek: newLek ? encodeURIComponent(JSON.stringify(newLek)) : null,
    });
  } catch (err) {
    console.error('Error fetching user recipes:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/recipes/search
// @desc    Search recipes with enhanced filtering and discovery
// @access  Private
router.get('/search', authMiddleware, async (req, res) => {
  const { 
    q, 
    category, 
    tags, 
    author, 
    isPublic, 
    limit = 20,
    lastEvaluatedKey,
    sortBy = 'relevance'
  } = req.query;
  
  if (!q && !category && !tags && !author) {
    return res.status(400).json({ message: 'At least one search parameter is required.' });
  }

  try {
    const searchLimit = Math.min(parseInt(limit), 50);
    const lek = lastEvaluatedKey ? JSON.parse(decodeURIComponent(lastEvaluatedKey)) : null;
    
    let results = [];
    let newLek = null;

    // Strategy 1: Category-based search using GSI3
    if (category) {
      const { recipes: categoryRecipes, lastEvaluatedKey: categoryLek } = await searchByCategory(
        category, 
        searchLimit, 
        lek
      );
      results = results.concat(categoryRecipes);
      newLek = categoryLek;
    }
    
    // Strategy 2: Author-based search using GSI1
    if (author) {
      const { recipes: authorRecipes, lastEvaluatedKey: authorLek } = await searchByAuthor(
        author,
        searchLimit,
        lek
      );
      results = results.concat(authorRecipes);
      newLek = authorLek;
    }
    
    // Strategy 3: Text search using scan with filters (for smaller datasets)
    if (q) {
      const { recipes: textRecipes, lastEvaluatedKey: textLek } = await searchByText(
        q,
        isPublic === 'true',
        searchLimit,
        lek
      );
      results = results.concat(textRecipes);
      newLek = textLek;
    }
    
    // Strategy 4: Tag-based filtering
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      results = filterByTags(results, tagArray);
    }
    
    // Remove duplicates based on recipe ID
    const uniqueResults = results.filter((recipe, index, self) => 
      index === self.findIndex(r => r.recipeId === recipe.recipeId)
    );
    
    // Sort results
    const sortedResults = sortSearchResults(uniqueResults, sortBy);
    
    // Limit final results
    const finalResults = sortedResults.slice(0, searchLimit);
    
    res.json({
      recipes: finalResults,
      total: uniqueResults.length,
      query: { q, category, tags, author, isPublic, sortBy },
      nextLek: newLek ? encodeURIComponent(JSON.stringify(newLek)) : null
    });
    
  } catch (error) {
    console.error('Error searching recipes:', error.message);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

// @route   GET /api/recipes/:id
// @desc    Get a specific recipe by ID (owned by user or public)
// @access  Private (but can fetch public recipes too)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    const expectedAuthorId = `USER#${req.user.id}`;
    console.log(`[AUTH_DEBUG] Recipe ID: ${req.params.id}, Recipe Author ID: ${recipe.authorId}, Expected Author ID: ${expectedAuthorId}, Is Public: ${recipe.isPublic}`);
    // Check if the recipe is public OR if the user is the author
    if (!recipe.isPublic && recipe.authorId !== expectedAuthorId) {
      console.log(`[AUTH_DEBUG] Authorization failed for recipe ${req.params.id}.`);
      return res.status(401).json({ message: 'User not authorized to view this recipe' });
    }
    res.json(recipe);
  } catch (err) {
    console.error('Error fetching recipe by ID:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/recipes/:id
// @desc    Update a recipe
// @access  Private
router.put('/:id', authMiddleware, (req, res) => {
  const uploadSingle = req.app.locals.upload.single('recipeImage');

  uploadSingle(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'Error uploading image for update.' });
    }

    const { name, description, cookingTime, servings, instructions, category, tags, ingredients: ingredientsJSON, image: imageFromBody, isPublic } = req.body;
    const recipeId = req.params.id;
    const authorId = `USER#${req.user.id}`;

    // Construct the object with fields to update
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (cookingTime !== undefined) updateData.cookingTime = cookingTime;
    if (servings !== undefined) updateData.servings = parseInt(servings, 10);
    if (instructions !== undefined) updateData.instructions = instructions;
    if (category !== undefined) updateData.category = category;
    if (isPublic !== undefined) updateData.isPublic = isPublic === 'true' || isPublic === true;

    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []);
    }
    if (ingredientsJSON !== undefined) {
      try {
        updateData.ingredients = ingredientsJSON ? JSON.parse(ingredientsJSON) : [];
      } catch (parseError) {
        return res.status(400).json({ message: 'Invalid ingredients JSON format for update.' });
      }
    }

    // Handle image update
    // This logic assumes you might want to clear the image or keep an existing one if no new file/URL is sent.
    let oldImagePath = null;
    if (req.file) { // New image uploaded
      updateData.image = `/uploads/recipe_images/${req.file.filename}`;
    } else if (imageFromBody === '' && req.body.hasOwnProperty('image')) { // Explicitly clearing the image
      updateData.image = '';
    } else if (imageFromBody !== undefined && req.body.hasOwnProperty('image')) { // An existing URL is provided or re-confirmed
      updateData.image = imageFromBody;
    }
    // If updateData.image is set, we might need to delete the old image file.
    // This requires fetching the recipe first to get the oldImagePath if a new image is uploaded or cleared.

    try {
      if (req.file || (imageFromBody === '' && req.body.hasOwnProperty('image'))) {
        const existingRecipe = await getRecipeById(recipeId);
        if (existingRecipe && existingRecipe.authorId === authorId && existingRecipe.image && existingRecipe.image.startsWith('/uploads/recipe_images/')) {
          oldImagePath = existingRecipe.image;
        }
      }

      const updatedRecipe = await updateRecipe(recipeId, authorId, updateData);

      if (oldImagePath && updateData.image !== oldImagePath) { // If image changed and old one was a local file
         fs.unlink(path.join(__dirname, '..', oldImagePath), (unlinkErr) => {
            if (unlinkErr) console.error(`Failed to delete old image ${oldImagePath}:`, unlinkErr.message);
          });
      }
      res.json(updatedRecipe);
    } catch (dbErr) {
      console.error('Error updating recipe:', dbErr.message);
      res.status(500).send('Server Error during update.');
    }
  });
});

// @route   DELETE /api/recipes/:id
// @desc    Delete a recipe
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  const recipeId = req.params.id;
  const authorId = `USER#${req.user.id}`;

  try {
    // Fetch recipe to get image path before deleting
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    if (recipe.authorId !== authorId) {
      return res.status(401).json({ message: 'User not authorized to delete this recipe' });
    }

    // TODO: Implement cascade delete for MealPlans if this recipe is used in any.
    // This would involve querying MealPlans by recipeId and deleting them.
    // For now, commenting out:
    // await MealPlan.deleteMany({ recipe: recipeId, user: req.user.id });

    await deleteRecipe(recipeId, authorId);

    if (recipe.image && recipe.image.startsWith('/uploads/recipe_images/')) {
      fs.unlink(path.join(__dirname, '..', recipe.image), (unlinkErr) => {
        if (unlinkErr) console.error(`Failed to delete image ${recipe.image}:`, unlinkErr.message);
      });
    }
    res.json({ message: 'Recipe removed successfully' });
  } catch (err) {
    console.error('Error deleting recipe:', err.message);
    res.status(500).send('Server Error');
  }
});

// --- ATTRIBUTION AND SOURCE MANAGEMENT ROUTES ---

// @route   GET /api/recipes/:id/attribution
// @desc    Get attribution information for a recipe
// @access  Public
router.get('/:id/attribution', async (req, res) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    const attribution = {
      recipeId: recipe.recipeId,
      recipeName: recipe.name,
      author: {
        username: recipe.authorUsername,
        id: recipe.authorId
      },
      sourceAttribution: recipe.sourceAttribution || null,
      originalSource: recipe.originalSource || null,
      importId: recipe.importId || null,
      license: recipe.license || 'All rights reserved',
      createdAt: recipe.createdAt,
      isPublic: recipe.isPublic
    };
    
    res.json(attribution);
    
  } catch (error) {
    console.error('Error fetching recipe attribution:', error.message);
    res.status(500).json({ message: 'Failed to fetch attribution information' });
  }
});

// @route   PUT /api/recipes/:id/attribution
// @desc    Update attribution information for a recipe
// @access  Private (Author only)
router.put('/:id/attribution', authMiddleware, async (req, res) => {
  const recipeId = req.params.id;
  const { sourceAttribution, originalSource, license } = req.body;
  const authorId = `USER#${req.user.id}`;
  
  try {
    const updateData = {};
    
    if (sourceAttribution !== undefined) updateData.sourceAttribution = sourceAttribution;
    if (originalSource !== undefined) updateData.originalSource = originalSource;
    if (license !== undefined) updateData.license = license;
    
    const updatedRecipe = await updateRecipe(recipeId, authorId, updateData);
    
    res.json({
      message: 'Attribution updated successfully',
      attribution: {
        sourceAttribution: updatedRecipe.sourceAttribution,
        originalSource: updatedRecipe.originalSource,
        license: updatedRecipe.license
      }
    });
    
  } catch (error) {
    console.error('Error updating attribution:', error.message);
    res.status(500).json({ message: 'Failed to update attribution' });
  }
});

// @route   GET /api/recipes/import/:importId
// @desc    Get all recipes from a specific import batch
// @access  Public
router.get('/import/:importId', async (req, res) => {
  const { importId } = req.params;
  const { limit = 20, lastEvaluatedKey } = req.query;
  
  try {
    const { docClient } = require('../config/db');
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    
    const params = {
      TableName: RECIPES_TABLE_NAME,
      FilterExpression: 'importId = :importId',
      ExpressionAttributeValues: {
        ':importId': importId
      },
      Limit: parseInt(limit)
    };
    
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }
    
    const result = await docClient.send(new ScanCommand(params));
    
    const recipes = result.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...recipe } = item;
      return recipe;
    });
    
    res.json({
      recipes,
      importId,
      total: recipes.length,
      nextLek: result.LastEvaluatedKey ? 
        encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
    });
    
  } catch (error) {
    console.error('Error fetching recipes by import ID:', error.message);
    res.status(500).json({ message: 'Failed to fetch imported recipes' });
  }
});

// @route   GET /api/recipes/sources
// @desc    Get list of all source attributions (for discovery)
// @access  Public
router.get('/sources', async (req, res) => {
  try {
    const { docClient } = require('../config/db');
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    
    const params = {
      TableName: RECIPES_TABLE_NAME,
      FilterExpression: 'attribute_exists(sourceAttribution) AND isPublic = :isPublic',
      ExpressionAttributeValues: {
        ':isPublic': true
      },
      ProjectionExpression: 'sourceAttribution, importId, createdAt'
    };
    
    const result = await docClient.send(new ScanCommand(params));
    
    // Group by source attribution
    const sourceGroups = {};
    
    result.Items.forEach(item => {
      if (item.sourceAttribution) {
        if (!sourceGroups[item.sourceAttribution]) {
          sourceGroups[item.sourceAttribution] = {
            name: item.sourceAttribution,
            count: 0,
            latestImport: null,
            imports: new Set()
          };
        }
        sourceGroups[item.sourceAttribution].count++;
        if (item.importId) {
          sourceGroups[item.sourceAttribution].imports.add(item.importId);
        }
        if (!sourceGroups[item.sourceAttribution].latestImport || 
            item.createdAt > sourceGroups[item.sourceAttribution].latestImport) {
          sourceGroups[item.sourceAttribution].latestImport = item.createdAt;
        }
      }
    });
    
    // Convert to array and clean up
    const sources = Object.values(sourceGroups)
      .map(source => ({
        name: source.name,
        recipeCount: source.count,
        importCount: source.imports.size,
        latestImport: source.latestImport
      }))
      .sort((a, b) => b.recipeCount - a.recipeCount);
    
    res.json({
      sources,
      total: sources.length
    });
    
  } catch (error) {
    console.error('Error fetching recipe sources:', error.message);
    res.status(500).json({ message: 'Failed to fetch recipe sources' });
  }
});

// --- BULK IMPORT ROUTES ---

// @route   POST /api/recipes/bulk-import/preview
// @desc    Preview bulk import data before actual import
// @access  Private (Admin only for public collections)
router.post('/bulk-import/preview', authMiddleware, bulkImportParser.single('importFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No import file uploaded.' });
  }

  try {
    const fileContent = req.file.buffer.toString('utf8');
    const { isPublic, sourceAttribution, collectionName } = req.body;
    
    let parsedRecipes = [];
    const importId = uuidv4();
    
    // Parse based on file type
    if (req.file.mimetype === 'application/json' || req.file.originalname.endsWith('.json')) {
      const jsonData = JSON.parse(fileContent);
      parsedRecipes = Array.isArray(jsonData) ? jsonData : [jsonData];
    } else if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      parsedRecipes = parseCSVRecipes(fileContent);
    } else {
      // Plain text - assume one recipe per file or custom format
      parsedRecipes = [parseTextRecipe(fileContent)];
    }
    
    // Validate and normalize recipes
    const validatedRecipes = [];
    const errors = [];
    
    for (let i = 0; i < parsedRecipes.length; i++) {
      try {
        const validated = validateAndNormalizeRecipe(parsedRecipes[i], i, {
          isPublic: isPublic === 'true',
          sourceAttribution,
          importId
        });
        validatedRecipes.push(validated);
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }
    
    res.json({
      importId,
      total: parsedRecipes.length,
      valid: validatedRecipes.length,
      invalid: errors.length,
      errors,
      preview: validatedRecipes.slice(0, 5), // Show first 5 for preview
      metadata: {
        isPublic: isPublic === 'true',
        sourceAttribution,
        collectionName,
        authorId: req.user.id,
        authorUsername: req.user.username
      }
    });
    
  } catch (error) {
    console.error('Error previewing bulk import:', error.message);
    res.status(400).json({ message: `Import preview failed: ${error.message}` });
  }
});

// @route   POST /api/recipes/bulk-import/execute
// @desc    Execute bulk import after preview confirmation
// @access  Private (Admin only for public collections)
router.post('/bulk-import/execute', authMiddleware, async (req, res) => {
  const { importId, recipes, metadata, createCollection } = req.body;
  
  if (!importId || !recipes || !Array.isArray(recipes)) {
    return res.status(400).json({ message: 'Invalid import data. importId and recipes array required.' });
  }
  
  try {
    const authorId = `USER#${req.user.id}`;
    const authorUsername = req.user.username;
    const batchSize = 25; // DynamoDB batch write limit
    const results = {
      successful: [],
      failed: [],
      collectionId: null
    };
    
    // Prepare recipes for batch import
    const preparedRecipes = recipes.map(recipe => {
      const recipeId = uuidv4();
      const timestamp = new Date().toISOString();
      
      const item = {
        PK: `RECIPE#${recipeId}`,
        SK: `METADATA#${recipeId}`,
        recipeId,
        authorId,
        authorUsername,
        ...recipe,
        sourceAttribution: metadata.sourceAttribution,
        importId,
        isPublic: metadata.isPublic || false,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Add GSI attributes
      const gsiAttrs = {};
      if (authorId) {
        gsiAttrs.GSI1PK = authorId;
        gsiAttrs.GSI1SK = `RECIPE#${timestamp}`;
      }
      if (item.isPublic !== undefined) {
        gsiAttrs.GSI2PK = `PUBLIC#${String(item.isPublic).toUpperCase()}`;
        gsiAttrs.GSI2SK = `CREATEDAT#${timestamp}`;
      }
      if (item.category) {
        gsiAttrs.GSI3PK = `CATEGORY#${item.category.toUpperCase()}`;
        gsiAttrs.GSI3SK = `RECIPE#${timestamp}`;
      }
      
      return { ...item, ...gsiAttrs };
    });
    
    // Use batch operations for optimized import
    const batchResult = await BatchOperations.bulkImportRecipes(
      preparedRecipes, 
      RECIPES_TABLE_NAME,
      (progress) => {
        console.log(`Import progress: ${progress.current}/${progress.total} batches`);
      }
    );
    
    // Map batch results to expected format
    results.successful = preparedRecipes.slice(0, batchResult.imported).map((recipe, index) => ({
      originalIndex: recipes[index]._originalIndex,
      recipeId: recipe.recipeId,
      name: recipe.name
    }));
    
    results.failed = recipes.slice(batchResult.imported).map((recipe, index) => ({
      originalIndex: recipe._originalIndex,
      name: recipe.name,
      error: batchResult.errors[index] || 'Unknown import error'
    }));
    
    // Create collection if requested
    if (createCollection && metadata.collectionName && results.successful.length > 0) {
      try {
        const { createRecipeCollection } = require('../models/RecipeCollection');
        
        const collectionData = {
          name: metadata.collectionName,
          description: `Imported collection from ${metadata.sourceAttribution || 'bulk import'}`,
          recipes: results.successful.map(r => r.recipeId),
          isPublic: metadata.isPublic || false,
          importId
        };
        
        const newCollection = await createRecipeCollection({
          collectionData,
          authorId,
          authorUsername
        });
        
        results.collectionId = newCollection.id;
      } catch (collectionError) {
        console.error('Error creating collection:', collectionError.message);
        // Don't fail the entire import if collection creation fails
      }
    }
    
    res.json({
      importId,
      message: `Bulk import completed. ${results.successful.length} recipes imported successfully, ${results.failed.length} failed.`,
      results
    });
    
  } catch (error) {
    console.error('Error executing bulk import:', error.message);
    res.status(500).json({ message: `Bulk import failed: ${error.message}` });
  }
});

// Helper functions for bulk import
function parseCSVRecipes(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) throw new Error('CSV must have header row and at least one data row');
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const recipes = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const recipe = { _originalIndex: i - 1 };
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim().replace(/^"|"$/g, ''); // Remove quotes
      
      switch (header) {
        case 'name':
        case 'title':
          recipe.name = value;
          break;
        case 'description':
          recipe.description = value;
          break;
        case 'cooking_time':
        case 'cookingtime':
        case 'cook_time':
          recipe.cookingTime = value;
          break;
        case 'servings':
          recipe.servings = parseInt(value) || 1;
          break;
        case 'instructions':
          recipe.instructions = value;
          break;
        case 'ingredients':
          recipe.ingredients = value ? value.split(';').map(ing => ({ 
            name: ing.trim(),
            amount: '',
            unit: ''
          })) : [];
          break;
        case 'category':
          recipe.category = value;
          break;
        case 'tags':
          recipe.tags = value ? value.split(';').map(tag => tag.trim()) : [];
          break;
        case 'image':
        case 'image_url':
          recipe.image = value;
          break;
      }
    });
    
    if (recipe.name) recipes.push(recipe);
  }
  
  return recipes;
}

function parseTextRecipe(textContent) {
  // Simple text parsing - can be enhanced
  const lines = textContent.split('\n').filter(line => line.trim());
  const recipe = { _originalIndex: 0 };
  
  // Try to extract basic info from text
  recipe.name = lines[0] || 'Imported Recipe';
  recipe.description = '';
  recipe.instructions = textContent;
  recipe.ingredients = [];
  recipe.cookingTime = '';
  recipe.servings = 1;
  recipe.category = '';
  recipe.tags = [];
  
  return recipe;
}

function validateAndNormalizeRecipe(recipe, index, metadata) {
  const normalized = {
    name: recipe.name || `Imported Recipe ${index + 1}`,
    description: recipe.description || '',
    cookingTime: recipe.cookingTime || recipe.cook_time || '',
    servings: parseInt(recipe.servings) || 1,
    instructions: recipe.instructions || recipe.method || '',
    ingredients: normalizeIngredients(recipe.ingredients || []),
    category: recipe.category || '',
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    image: recipe.image || recipe.image_url || '',
    isPublic: metadata.isPublic,
    sourceAttribution: metadata.sourceAttribution,
    importId: metadata.importId,
    _originalIndex: index
  };
  
  // Validation
  if (!normalized.name.trim()) {
    throw new Error('Recipe name is required');
  }
  if (!normalized.instructions.trim()) {
    throw new Error('Recipe instructions are required');
  }
  
  return normalized;
}

function normalizeIngredients(ingredients) {
  if (typeof ingredients === 'string') {
    return ingredients.split('\n').map(line => ({
      name: line.trim(),
      amount: '',
      unit: ''
    }));
  }
  
  if (Array.isArray(ingredients)) {
    return ingredients.map(ing => {
      if (typeof ing === 'string') {
        return { name: ing, amount: '', unit: '' };
      }
      return {
        name: ing.name || ing.ingredient || '',
        amount: ing.amount || ing.quantity || '',
        unit: ing.unit || ''
      };
    });
  }
  
  return [];
}

// Search helper functions
async function searchByCategory(category, limit, lastEvaluatedKey) {
  const { docClient } = require('../config/db');
  const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
  
  const params = {
    TableName: RECIPES_TABLE_NAME,
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :categoryPK',
    ExpressionAttributeValues: {
      ':categoryPK': `CATEGORY#${category.toUpperCase()}`
    },
    Limit: limit,
    ScanIndexForward: false // Sort by creation time, newest first
  };
  
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }
  
  try {
    const result = await docClient.send(new QueryCommand(params));
    return {
      recipes: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (error) {
    console.error('Error searching by category:', error);
    return { recipes: [], lastEvaluatedKey: null };
  }
}

async function searchByAuthor(authorUsername, limit, lastEvaluatedKey) {
  const { docClient } = require('../config/db');
  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
  
  const params = {
    TableName: RECIPES_TABLE_NAME,
    FilterExpression: 'contains(authorUsername, :username)',
    ExpressionAttributeValues: {
      ':username': authorUsername
    },
    Limit: limit
  };
  
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }
  
  try {
    const result = await docClient.send(new ScanCommand(params));
    return {
      recipes: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (error) {
    console.error('Error searching by author:', error);
    return { recipes: [], lastEvaluatedKey: null };
  }
}

async function searchByText(searchText, isPublicOnly = false, limit, lastEvaluatedKey) {
  const { docClient } = require('../config/db');
  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
  
  const searchWords = searchText.toLowerCase().split(' ').filter(word => word.length > 2);
  
  let filterExpression = '';
  let expressionAttributeValues = {};
  
  // Build filter expression for text search
  const nameConditions = searchWords.map((word, index) => {
    expressionAttributeValues[`:word${index}`] = word;
    return `contains(#name, :word${index})`;
  });
  
  const descriptionConditions = searchWords.map((word, index) => {
    return `contains(description, :word${index})`;
  });
  
  filterExpression = `(${nameConditions.join(' OR ')}) OR (${descriptionConditions.join(' OR ')})`;
  
  if (isPublicOnly) {
    filterExpression += ' AND isPublic = :isPublic';
    expressionAttributeValues[':isPublic'] = true;
  }
  
  const params = {
    TableName: RECIPES_TABLE_NAME,
    FilterExpression: filterExpression,
    ExpressionAttributeNames: {
      '#name': 'name' // 'name' is a reserved keyword in DynamoDB
    },
    ExpressionAttributeValues: expressionAttributeValues,
    Limit: limit
  };
  
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }
  
  try {
    const result = await docClient.send(new ScanCommand(params));
    return {
      recipes: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (error) {
    console.error('Error searching by text:', error);
    return { recipes: [], lastEvaluatedKey: null };
  }
}

function filterByTags(recipes, requiredTags) {
  return recipes.filter(recipe => {
    if (!recipe.tags || !Array.isArray(recipe.tags)) return false;
    
    const recipeTags = recipe.tags.map(tag => tag.toLowerCase());
    return requiredTags.some(requiredTag => 
      recipeTags.some(recipeTag => 
        recipeTag.includes(requiredTag.toLowerCase())
      )
    );
  });
}

function sortSearchResults(recipes, sortBy) {
  switch (sortBy) {
    case 'newest':
      return recipes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'oldest':
      return recipes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case 'name':
      return recipes.sort((a, b) => a.name.localeCompare(b.name));
    case 'cookingTime':
      return recipes.sort((a, b) => {
        const timeA = parseInt(a.cookingTime) || 999;
        const timeB = parseInt(b.cookingTime) || 999;
        return timeA - timeB;
      });
    case 'relevance':
    default:
      // For relevance, keep original order (search algorithms should provide relevance-based results)
      return recipes;
  }
}

// Additional helper functions for enhanced discovery
async function getFeaturedCategories() {
  // Return popular categories for featured content
  const categories = [
    { name: 'Breakfast', count: 0, featured: true },
    { name: 'Dinner', count: 0, featured: true },
    { name: 'Dessert', count: 0, featured: true },
    { name: 'Vegan', count: 0, featured: true },
    { name: 'Quick', count: 0, featured: true },
    { name: 'Healthy', count: 0, featured: true }
  ];
  
  // TODO: Add actual counts from category queries
  return categories;
}

async function getRecipeCategories() {
  const { docClient } = require('../config/db');
  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
  
  try {
    // Scan for all public recipes to count categories
    const params = {
      TableName: RECIPES_TABLE_NAME,
      FilterExpression: 'isPublic = :isPublic',
      ExpressionAttributeValues: {
        ':isPublic': true
      },
      ProjectionExpression: 'category'
    };
    
    const result = await docClient.send(new ScanCommand(params));
    const categoryCount = {};
    
    // Count occurrences of each category
    result.Items.forEach(item => {
      if (item.category) {
        const category = item.category.toLowerCase();
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });
    
    // Convert to array and sort by count
    const categories = Object.entries(categoryCount)
      .map(([name, count]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        count 
      }))
      .sort((a, b) => b.count - a.count);
    
    return categories;
    
  } catch (error) {
    console.error('Error getting recipe categories:', error);
    return [];
  }
}

module.exports = router;
