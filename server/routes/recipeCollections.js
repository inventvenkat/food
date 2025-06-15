const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createRecipeCollection,
  getRecipeCollectionById,
  getRecipeCollectionsByAuthor,
  getPublicRecipeCollections,
  updateRecipeCollection,
  deleteRecipeCollection,
  addRecipeToCollection,
  removeRecipeFromCollection
} = require('../models/RecipeCollection');
// No longer need Recipe model here directly for validation if IDs are treated as opaque strings by routes
// const mongoose = require('mongoose'); // Mongoose removed

// Multer setup (assuming it's defined in app.locals.upload as in other route files)
// If not, it should be configured here similarly to recipes.js or globally.

// @route   POST /api/collections
// @desc    Create a new recipe collection
// @access  Private
router.post('/', authMiddleware, (req, res) => {
  const uploadSingle = req.app.locals.upload.single('collectionCoverImage');

  uploadSingle(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'Error uploading cover image.' });
    }

    const { name, description, recipes: recipesJSON, isPublic } = req.body;
    const authorId = `USER#${req.user.id}`;
    const authorUsername = req.user.username;

    // TODO: Add comprehensive input validation
    if (!name) {
      return res.status(400).json({ message: 'Collection name is required.' });
    }

    let recipeIds = [];
    if (recipesJSON) {
      try {
        recipeIds = JSON.parse(recipesJSON);
        // Validate that it's an array of strings. Prefixing will be handled before DB interaction.
        if (!Array.isArray(recipeIds) || !recipeIds.every(id => typeof id === 'string')) {
          return res.status(400).json({ message: 'Invalid recipe IDs format. Expected array of recipe ID strings.' });
        }
      } catch (e) {
        return res.status(400).json({ message: 'Error parsing recipe IDs.' });
      }
    }

    let coverImageUrl = req.body.coverImage || '';
    if (req.file) {
      coverImageUrl = `/uploads/recipe_images/${req.file.filename}`; // Using same dir as recipe images
    }

    try {
      const collectionData = {
        name,
        description: description || '',
        // Ensure IDs are prefixed before passing to the model function
        recipes: recipeIds.map(id => id.startsWith('RECIPE#') ? id : `RECIPE#${id}`),
        isPublic: isPublic === 'true' || isPublic === true,
        coverImage: coverImageUrl,
      };
      // Spread collectionData and pass authorId, authorUsername.
      // The model's 'recipes: inputRecipes' alias will pick up 'collectionData.recipes'.
      const newCollection = await createRecipeCollection({ ...collectionData, authorId, authorUsername });
      res.status(201).json(newCollection);
    } catch (dbErr) {
      console.error('Error creating collection:', dbErr);
      res.status(500).send('Server Error');
    }
  });
});

// @route   GET /api/collections
// @desc    Get all collections for the logged-in user (paginated)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const lastEvaluatedKey = req.query.lek ? JSON.parse(decodeURIComponent(req.query.lek)) : null;
  const authorId = req.user.id; // Just the UUID part from token
  console.log(`[DEBUG] GET /api/collections - req.user.id: ${req.user.id}, authorId for query: ${authorId}`);

  try {
    const { collections, lastEvaluatedKey: newLek } = await getRecipeCollectionsByAuthor(authorId, limit, lastEvaluatedKey);
    // Collections will contain recipe IDs. Client can fetch recipe details if needed.
    res.json({
      collections,
      nextLek: newLek ? encodeURIComponent(JSON.stringify(newLek)) : null,
    });
  } catch (err) {
    console.error('Error fetching user collections:', err);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/collections/public
// @desc    Get all public collections (paginated)
// @access  Public
router.get('/public', async (req, res) => {
  const limit = parseInt(req.query.limit) || 9;
  const lastEvaluatedKey = req.query.lek ? JSON.parse(decodeURIComponent(req.query.lek)) : null;

  try {
    const { collections, lastEvaluatedKey: newLek } = await getPublicRecipeCollections(limit, lastEvaluatedKey);
    // Collections will contain recipe IDs and denormalized authorUsername.
    res.json({
      collections,
      nextLek: newLek ? encodeURIComponent(JSON.stringify(newLek)) : null,
    });
  } catch (err) {
    console.error('Error fetching public collections:', err);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/collections/:id
// @desc    Get a specific collection by ID
// @access  Public (if collection isPublic) or Private (if owner, requires auth token)
router.get('/:id', authMiddleware, async (req, res) => { // Added authMiddleware to simplify owner check
  try {
    const collection = await getRecipeCollectionById(req.params.id);

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found.' });
    }

    if (!collection.isPublic && collection.authorId !== `USER#${req.user.id}`) {
      return res.status(403).json({ message: 'Access denied. This collection is private.' });
    }
    // Collection contains recipe IDs. Client fetches recipe details if needed.
    res.json(collection);
  } catch (err) {
    console.error('Error fetching collection by ID:', err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/collections/:id
// @desc    Update a collection's details (name, description, isPublic, coverImage)
// @access  Private
router.put('/:id', authMiddleware, (req, res) => {
  const uploadSingle = req.app.locals.upload.single('collectionCoverImage');

  uploadSingle(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'Error uploading cover image for update.' });
    }

    const { name, description, isPublic, coverImage: coverImageFromBody } = req.body;
    const authorId = `USER#${req.user.id}`;
    const collectionId = req.params.id;

    // TODO: Add comprehensive input validation
    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (description !== undefined) fieldsToUpdate.description = description;
    if (isPublic !== undefined) fieldsToUpdate.isPublic = isPublic === 'true' || isPublic === true;

    let oldCoverImagePath = null;
    if (req.file) {
      fieldsToUpdate.coverImage = `/uploads/recipe_images/${req.file.filename}`;
    } else if (coverImageFromBody === '' && req.body.hasOwnProperty('coverImage')) {
      fieldsToUpdate.coverImage = '';
    } else if (coverImageFromBody !== undefined) {
      fieldsToUpdate.coverImage = coverImageFromBody;
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({ message: "No fields to update provided." });
    }

    try {
      if (fieldsToUpdate.coverImage !== undefined) { // If image is being changed or cleared
        const existingCollection = await getRecipeCollectionById(collectionId);
        if (existingCollection && existingCollection.authorId === authorId && existingCollection.coverImage && existingCollection.coverImage.startsWith('/uploads/recipe_images/')) {
          if (fieldsToUpdate.coverImage !== existingCollection.coverImage) { // Only if new image is different or cleared
            oldCoverImagePath = existingCollection.coverImage;
          }
        } else if (!existingCollection || existingCollection.authorId !== authorId) {
          return res.status(403).json({ message: 'User not authorized or collection not found.' });
        }
      }

      const updatedCollection = await updateRecipeCollection(collectionId, authorId, fieldsToUpdate);

      if (oldCoverImagePath) {
        fs.unlink(path.join(__dirname, '..', oldCoverImagePath), (unlinkErr) => {
          if (unlinkErr) console.error(`Failed to delete old cover image ${oldCoverImagePath}:`, unlinkErr.message);
        });
      }
      res.json(updatedCollection);
    } catch (dbErr) {
      console.error('Error updating collection:', dbErr);
      res.status(500).send('Server Error');
    }
  });
});

// @route   POST /api/collections/:id/recipes
// @desc    Add a recipe to a collection
// @access  Private
router.post('/:id/recipes', authMiddleware, async (req, res) => {
  const { recipeId } = req.body; // Expecting a single recipeId like "RECIPE#<uuid>"
  const collectionId = req.params.id;
  const authorId = `USER#${req.user.id}`;

  // TODO: Validate recipeId format
  if (!recipeId || typeof recipeId !== 'string' || !recipeId.startsWith('RECIPE#')) {
    return res.status(400).json({ message: 'Valid recipeId (RECIPE#<id>) is required.' });
  }

  try {
    // Optional: Check if recipe exists and is accessible by user before adding
    const updatedCollection = await addRecipeToCollection(collectionId, recipeId, authorId);
    res.json(updatedCollection);
  } catch (error) {
    console.error('Error adding recipe to collection:', error);
    if (error.message.includes("ConditionalCheckFailedException") || error.message.includes("You might not be the author")) { // Crude check
        return res.status(403).json({ message: "Failed to add recipe: Collection not found or not owned by user."})
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/collections/:id/recipes/:recipeId
// @desc    Remove a recipe from a collection
// @access  Private
router.delete('/:id/recipes/:recipeId', authMiddleware, async (req, res) => {
  const { id: collectionId, recipeId } = req.params;
  const authorId = `USER#${req.user.id}`;
  const fullRecipeId = `RECIPE#${recipeId}`; // Assuming recipeId param is just the UUID part

  // TODO: Validate recipeId format from param
  if (!recipeId) {
    return res.status(400).json({ message: 'Valid recipeId parameter is required.' });
  }

  try {
    const updatedCollection = await removeRecipeFromCollection(collectionId, fullRecipeId, authorId);
    res.json(updatedCollection);
  } catch (error) {
    console.error('Error removing recipe from collection:', error);
     if (error.message.includes("ConditionalCheckFailedException") || error.message.includes("You might not be the author")) {
        return res.status(403).json({ message: "Failed to remove recipe: Collection not found or not owned by user."})
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/collections/:id
// @desc    Delete a collection
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  const collectionId = req.params.id;
  const authorId = `USER#${req.user.id}`;
  try {
    const collection = await getRecipeCollectionById(collectionId); // Fetch to get cover image path
    if (!collection) {
        return res.status(404).json({ message: 'Collection not found.' });
    }
    if (collection.authorId !== authorId) {
        return res.status(403).json({ message: 'User not authorized to delete this collection.' });
    }

    await deleteRecipeCollection(collectionId, authorId);

    if (collection.coverImage && collection.coverImage.startsWith('/uploads/recipe_images/')) {
      fs.unlink(path.join(__dirname, '..', collection.coverImage), (unlinkErr) => {
        if (unlinkErr) console.error(`Failed to delete cover image ${collection.coverImage}:`, unlinkErr.message);
      });
    }
    res.json({ message: 'Collection deleted successfully.' });
  } catch (err) {
    console.error('Error deleting collection:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
