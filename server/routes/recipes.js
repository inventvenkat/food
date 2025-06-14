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
// @desc    Search recipes (functionality significantly changed from Mongoose $text search)
// @access  Private
router.get('/search', authMiddleware, async (req, res) => {
  const { q } = req.query;
  // TODO: Implement search for DynamoDB. This is non-trivial.
  // MongoDB's $text search is not available.
  // Options for DynamoDB:
  // 1. Scan + FilterExpression (inefficient for large tables, expensive).
  // 2. Design GSIs for specific search patterns (e.g., by tag, by partial title - requires data duplication/transformation).
  // 3. Integrate with a dedicated search service (e.g., Amazon OpenSearch Service).
  // For now, this route will return an empty array or a message.
  console.warn("/api/recipes/search endpoint needs a new implementation for DynamoDB.");
  if (!q) return res.status(400).json({ message: 'Search query is required.' });
  res.json({ message: "Search functionality for DynamoDB is pending implementation.", recipes: [] });
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
    // Check if the recipe is public OR if the user is the author
    if (!recipe.isPublic && recipe.authorId !== `USER#${req.user.id}`) {
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

module.exports = router;
