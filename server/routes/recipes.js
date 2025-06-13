const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const Recipe = require('../models/Recipe');
const User = require('../models/User'); // May not be needed directly if populated
const MealPlan = require('../models/MealPlan'); // Import MealPlan model for cascade delete
const multer = require('multer');
const { extractTextFromFile, customIngredientParser } = require('../utils/recipeParser');

// Configure multer for in-memory file storage for recipe text extraction
const recipeUploadParser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for uploaded files
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt, .pdf, .doc, .docx are allowed.'), false);
    }
  }
});

// --- PUBLIC ROUTES (Define before parameterized routes like /:id) ---

// @route   GET /api/recipes/public
// @desc    Get all public recipes (paginated)
// @access  Public
router.get('/public', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const publicRecipes = await Recipe.find({ isPublic: true })
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalPublicRecipes = await Recipe.countDocuments({ isPublic: true });
    res.json({
      recipes: publicRecipes,
      currentPage: page,
      totalPages: Math.ceil(totalPublicRecipes / limit),
      totalRecipes: totalPublicRecipes,
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
    const recipe = await Recipe.findOne({ _id: req.params.id, isPublic: true })
      .populate('user', 'username');
    if (!recipe) {
      return res.status(404).json({ message: 'Public recipe not found or not public.' });
    }
    res.json(recipe);
  } catch (err) {
    console.error('Error fetching public recipe by ID:', err.message);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Recipe not found (invalid ID format).' });
    }
    res.status(500).send('Server Error');
  }
});

// --- AUTHENTICATED ROUTES ---

// @route   POST /api/recipes
// @desc    Create a new recipe
// @access  Private
router.post('/', authMiddleware, (req, res) => {
  const uploadSingle = req.app.locals.upload.single('recipeImage');
  uploadSingle(req, res, async (err) => {
    if (err) {
      if (!res.headersSent) {
        return res.status(400).json({ message: err.message || 'Error uploading file.' });
      }
      console.error("Multer error after headers sent:", err);
      return;
    }
    const { name, description, cookingTime, servings, instructions, category, tags, ingredients: ingredientsJSON, isPublic } = req.body;
    if (!name || !cookingTime || !servings || !instructions) {
      return res.status(400).json({ message: 'Please provide name, cooking time, servings, and instructions.' });
    }
    let ingredients = [];
    try {
      if (ingredientsJSON) ingredients = JSON.parse(ingredientsJSON);
    } catch (parseError) {
      return res.status(400).json({ message: 'Invalid ingredients format.' });
    }
    let imageUrl = req.body.image;
    if (req.file) imageUrl = `/uploads/recipe_images/${req.file.filename}`;
    try {
      const newRecipe = new Recipe({
        name, description, cookingTime, servings, instructions, image: imageUrl, category,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(tag => tag)) : [],
        ingredients,
        isPublic: isPublic === 'true' || isPublic === true,
        user: req.user.id,
      });
      const recipe = await newRecipe.save();
      res.status(201).json(recipe);
    } catch (dbErr) {
      console.error('Database save error:', dbErr.message);
      if (dbErr.name === 'ValidationError') {
          return res.status(400).json({ message: Object.values(dbErr.errors).map(val => val.message).join(', ') });
      }
      res.status(500).send('Server Error');
    }
  });
});

// @route   POST /api/recipes/upload-extract
// @desc    Upload a recipe file, extract text, and parse ingredients
// @access  Private
router.post('/upload-extract', authMiddleware, recipeUploadParser.single('recipeFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file type rejected.' });
  }

  try {
    const textContent = await extractTextFromFile(req.file);
    const parsedRecipeData = customIngredientParser(textContent); // This now returns an object

    // The parsedRecipeData should be like:
    // { title: '', description: '', cookingTime: '', servings: '', ingredients: [], instructions: '' }

    res.json(parsedRecipeData); // Return the whole object
  } catch (error) {
    console.error('Error processing uploaded recipe file:', error.message);
    // Check if the error is from our custom file type validation or parser
    if (error.message.startsWith('Unsupported file type') || error.message.startsWith('Invalid file object') || error.message.includes('Could not extract text')) {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).send('Server Error during recipe file processing.');
  }
});


// @route   GET /api/recipes
// @desc    Get all recipes for the logged-in user
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const recipes = await Recipe.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(recipes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/recipes/search
// @desc    Search recipes by text query (user's own and public)
// @access  Private
router.get('/search', authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: 'Search query is required.' });
  try {
    const searchCriteria = {
      $text: { $search: q },
      $or: [ { user: req.user.id }, { isPublic: true } ]
    };
    const recipes = await Recipe.find(searchCriteria, { score: { $meta: "textScore" } })
      .populate('user', 'username')
      .sort({ score: { $meta: "textScore" } })
      .limit(50);
    res.json(recipes);
  } catch (err) {
    console.error('Error searching recipes:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/recipes/:id
// @desc    Get a specific recipe by ID (owned by user)
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
    if (recipe.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to view this recipe' });
    }
    res.json(recipe);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Recipe not found (invalid ID format)' });
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/recipes/:id
// @desc    Update a recipe
// @access  Private
router.put('/:id', authMiddleware, (req, res) => {
  const uploadSingle = req.app.locals.upload.single('recipeImage');
  uploadSingle(req, res, async (err) => {
    if (err) {
      if (!res.headersSent) return res.status(400).json({ message: err.message || 'Error uploading file for update.' });
      console.error("Multer error during update after headers sent:", err); return;
    }
    const { name, description, cookingTime, servings, instructions, category, tags, ingredients: ingredientsJSON, image: imageFromBody } = req.body;
    const recipeFieldsToUpdate = {};
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'name')) recipeFieldsToUpdate.name = name;
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'description')) recipeFieldsToUpdate.description = description;
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'cookingTime')) recipeFieldsToUpdate.cookingTime = cookingTime;
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'servings')) recipeFieldsToUpdate.servings = servings;
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'instructions')) recipeFieldsToUpdate.instructions = instructions;
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'category')) recipeFieldsToUpdate.category = category;
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'isPublic')) {
        recipeFieldsToUpdate.isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'tags')) {
        recipeFieldsToUpdate.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []);
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'ingredients')) {
      try {
        recipeFieldsToUpdate.ingredients = ingredientsJSON ? JSON.parse(ingredientsJSON) : [];
      } catch (parseError) {
        return res.status(400).json({ message: 'Invalid ingredients format for update.' });
      }
    }
    try {
      let existingRecipe = await Recipe.findById(req.params.id);
      if (!existingRecipe) return res.status(404).json({ message: 'Recipe not found' });
      if (existingRecipe.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'User not authorized to update this recipe' });
      }
      const oldImagePath = existingRecipe.image;
      if (req.file) {
        recipeFieldsToUpdate.image = `/uploads/recipe_images/${req.file.filename}`;
        if (oldImagePath && oldImagePath.startsWith('/uploads/recipe_images/')) {
          fs.unlink(path.join(__dirname, '..', oldImagePath), (unlinkErr) => { // Corrected path for unlink
            if (unlinkErr) console.error(`Failed to delete old image ${oldImagePath}:`, unlinkErr.message);
          });
        }
      } else if (imageFromBody === '' && req.body.hasOwnProperty('image')) {
        recipeFieldsToUpdate.image = '';
        if (oldImagePath && oldImagePath.startsWith('/uploads/recipe_images/')) {
          fs.unlink(path.join(__dirname, '..', oldImagePath), (unlinkErr) => { // Corrected path for unlink
            if (unlinkErr) console.error(`Failed to delete old image ${oldImagePath} (on clear):`, unlinkErr.message);
          });
        }
      } else if (imageFromBody !== undefined && req.body.hasOwnProperty('image')) {
        recipeFieldsToUpdate.image = imageFromBody;
      }
      const updatedRecipe = await Recipe.findByIdAndUpdate(req.params.id, { $set: recipeFieldsToUpdate }, { new: true, runValidators: true });
      if (!updatedRecipe) return res.status(404).json({ message: 'Recipe not found after update.' });
      res.json(updatedRecipe);
    } catch (dbErr) {
      console.error('DB update error:', dbErr.message);
      if (dbErr.name === 'ValidationError') return res.status(400).json({ message: Object.values(dbErr.errors).map(val => val.message).join(', ') });
      if (dbErr.kind === 'ObjectId') return res.status(404).json({ message: 'Recipe not found (invalid ID for update)' });
      res.status(500).send('Server Error during update.');
    }
  });
});

// @route   DELETE /api/recipes/:id
// @desc    Delete a recipe
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
    if (recipe.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this recipe' });
    }
    const imagePath = recipe.image;
    await MealPlan.deleteMany({ recipe: req.params.id, user: req.user.id });
    await Recipe.findByIdAndDelete(req.params.id);
    if (imagePath && imagePath.startsWith('/uploads/recipe_images/')) {
      fs.unlink(path.join(__dirname, '..', imagePath), (unlinkErr) => { // Corrected path for unlink
        if (unlinkErr) console.error(`Failed to delete image ${imagePath}:`, unlinkErr.message);
      });
    }
    res.json({ message: 'Recipe removed successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Recipe not found (invalid ID format)' });
    res.status(500).send('Server Error');
  }
});

module.exports = router;
