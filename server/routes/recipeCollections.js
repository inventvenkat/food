const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const RecipeCollection = require('../models/RecipeCollection');
const Recipe = require('../models/Recipe'); // To validate recipes being added
const mongoose = require('mongoose');

// @route   POST /api/collections
// @desc    Create a new recipe collection
// @access  Private
router.post('/', authMiddleware, (req, res) => {
    const uploadSingle = req.app.locals.upload.single('collectionCoverImage');

    uploadSingle(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Error uploading cover image.' });
        }

        const { name, description, recipes: recipesJSON, isPublic } = req.body;
        const userId = req.user.id;

        if (!name) {
            return res.status(400).json({ message: 'Collection name is required.' });
        }

        let recipeIds = [];
        if (recipesJSON) {
            try {
                recipeIds = JSON.parse(recipesJSON);
                if (!Array.isArray(recipeIds) || !recipeIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
                    return res.status(400).json({ message: 'Invalid recipe IDs format.' });
                }
            } catch (e) {
                return res.status(400).json({ message: 'Error parsing recipe IDs.' });
            }
        }
        
        let coverImageUrl = req.body.coverImage || '';
        if (req.file) {
            coverImageUrl = `/uploads/recipe_images/${req.file.filename}`; // Assuming same dir for now
        }

        try {
            // Optional: Validate that all recipeIds exist and belong to the user if collections are strictly personal
            // For now, we assume valid recipe IDs are provided.

            const newCollection = new RecipeCollection({
                name,
                description: description || '',
                user: userId,
                recipes: recipeIds,
                isPublic: isPublic === 'true' || isPublic === true,
                coverImage: coverImageUrl,
            });

            const savedCollection = await newCollection.save();
            // Populate user and recipes for the response
            const populatedCollection = await RecipeCollection.findById(savedCollection._id)
                .populate('user', 'username')
                .populate('recipes', 'name image cookingTime servings'); // Populate some recipe details

            res.status(201).json(populatedCollection);
        } catch (dbErr) {
            console.error('Error creating collection:', dbErr);
            if (dbErr.name === 'ValidationError') {
                return res.status(400).json({ message: Object.values(dbErr.errors).map(val => val.message).join(', ') });
            }
            res.status(500).send('Server Error');
        }
    });
});

// @route   GET /api/collections
// @desc    Get all collections for the logged-in user
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const collections = await RecipeCollection.find({ user: req.user.id })
            .populate('user', 'username')
            .populate('recipes', 'name image') // Populate only essential recipe info for list view
            .sort({ createdAt: -1 });
        res.json(collections);
    } catch (err) {
        console.error('Error fetching user collections:', err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/collections/public
// @desc    Get all public collections (paginated)
// @access  Public
router.get('/public', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9; // Default to 9 per page
  const skip = (page - 1) * limit;

  try {
    const publicCollections = await RecipeCollection.find({ isPublic: true })
      .populate('user', 'username') // Populate owner's username
      .populate('recipes', 'name') // Populate recipe names, or count
      .sort({ createdAt: -1 })    // Sort by newest first
      .skip(skip)
      .limit(limit);
    
    const totalPublicCollections = await RecipeCollection.countDocuments({ isPublic: true });

    res.json({
      collections: publicCollections,
      currentPage: page,
      totalPages: Math.ceil(totalPublicCollections / limit),
      totalCollections: totalPublicCollections,
    });

  } catch (err) {
    console.error('Error fetching public collections:', err);
    res.status(500).send('Server Error');
  }
});


// @route   GET /api/collections/:id
// @desc    Get a specific collection by ID
// @access  Public (if collection isPublic) or Private (if owner)
router.get('/:id', async (req, res) => { 
    try {
        const collection = await RecipeCollection.findById(req.params.id)
            .populate('user', 'username')
            .populate('recipes'); // Populate full recipe details for collection view

        if (!collection) {
            return res.status(404).json({ message: 'Collection not found.' });
        }

        if (!collection.isPublic) {
            // If private, check ownership using authMiddleware logic (if token provided)
            // This requires a more flexible auth check or separate endpoints
            // For now, let's assume if it's not public, it's an error for non-owners.
            // A better way: use authMiddleware, then check if public or owner.
            // Let's add authMiddleware and then check.
            // This means non-logged-in users can't see private collections even if they have the link.
            // This will be refined when we add the /public collections endpoint.
            
            // Re-evaluating: for a single GET /:id, it should allow public access.
            // If it's private, then it must be the owner.
            const token = req.header('Authorization');
            let userId = null;
            if (token) {
                try {
                    const justToken = token.split(' ')[1];
                    const decoded = require('jsonwebtoken').verify(justToken, process.env.JWT_SECRET);
                    userId = decoded.user.id;
                } catch (e) { /* invalid token, treat as guest */ }
            }

            if (collection.user.toString() !== userId) {
                 return res.status(403).json({ message: 'Access denied. This collection is private.' });
            }
        }
        
        res.json(collection);
    } catch (err) {
        console.error('Error fetching collection by ID:', err);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Collection not found (invalid ID).' });
        }
        res.status(500).send('Server Error');
    }
});


// @route   PUT /api/collections/:id
// @desc    Update a collection
// @access  Private
router.put('/:id', authMiddleware, (req, res) => {
    const uploadSingle = req.app.locals.upload.single('collectionCoverImage');

    uploadSingle(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Error uploading cover image for update.' });
        }

        const { name, description, recipes: recipesJSON, isPublic, coverImage: coverImageFromBody } = req.body;
        const userId = req.user.id;
        const collectionId = req.params.id;

        try {
            let collection = await RecipeCollection.findById(collectionId);
            if (!collection) {
                return res.status(404).json({ message: 'Collection not found.' });
            }
            if (collection.user.toString() !== userId) {
                return res.status(403).json({ message: 'User not authorized to update this collection.' });
            }

            const fieldsToUpdate = {};
            if (name !== undefined) fieldsToUpdate.name = name;
            if (description !== undefined) fieldsToUpdate.description = description;
            if (isPublic !== undefined) fieldsToUpdate.isPublic = isPublic === 'true' || isPublic === true;

            if (recipesJSON !== undefined) {
                try {
                    const recipeIds = JSON.parse(recipesJSON);
                    if (!Array.isArray(recipeIds) || !recipeIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
                        return res.status(400).json({ message: 'Invalid recipe IDs format for update.' });
                    }
                    fieldsToUpdate.recipes = recipeIds;
                } catch (e) {
                    return res.status(400).json({ message: 'Error parsing recipe IDs for update.' });
                }
            }
            
            const oldCoverImagePath = collection.coverImage;
            if (req.file) { // New image uploaded
                fieldsToUpdate.coverImage = `/uploads/recipe_images/${req.file.filename}`;
                if (oldCoverImagePath && oldCoverImagePath.startsWith('/uploads/recipe_images/')) {
                    // TODO: Delete old image from fs
                }
            } else if (coverImageFromBody === '' && req.body.hasOwnProperty('coverImage')) {
                fieldsToUpdate.coverImage = ''; // Remove image
                if (oldCoverImagePath && oldCoverImagePath.startsWith('/uploads/recipe_images/')) {
                    // TODO: Delete old image from fs
                }
            } else if (coverImageFromBody !== undefined) {
                fieldsToUpdate.coverImage = coverImageFromBody; // Keep existing or set to new URL if provided
            }


            const updatedCollection = await RecipeCollection.findByIdAndUpdate(
                collectionId,
                { $set: fieldsToUpdate },
                { new: true, runValidators: true }
            ).populate('user', 'username').populate('recipes', 'name image');

            res.json(updatedCollection);

        } catch (dbErr) {
            console.error('Error updating collection:', dbErr);
            if (dbErr.name === 'ValidationError') {
                return res.status(400).json({ message: Object.values(dbErr.errors).map(val => val.message).join(', ') });
            }
            res.status(500).send('Server Error');
        }
    });
});

// @route   DELETE /api/collections/:id
// @desc    Delete a collection
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const collection = await RecipeCollection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found.' });
        }
        if (collection.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'User not authorized to delete this collection.' });
        }

        // TODO: Delete cover image if stored locally
        // const coverImagePath = collection.coverImage;
        // if (coverImagePath && coverImagePath.startsWith('/uploads/recipe_images/')) { ... fs.unlink ... }

        await RecipeCollection.findByIdAndDelete(req.params.id);
        res.json({ message: 'Collection deleted successfully.' });
    } catch (err) {
        console.error('Error deleting collection:', err);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Collection not found (invalid ID).' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
