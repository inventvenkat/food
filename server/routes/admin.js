const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

// Import models
const {
  getRecipeById,
  getPublicRecipes,
  updateRecipe,
  deleteRecipe
} = require('../models/Recipe');

const {
  getRecipeCollectionById,
  getPublicRecipeCollections,
  updateRecipeCollection,
  deleteRecipeCollection,
  createRecipeCollection
} = require('../models/RecipeCollection');

// Admin middleware - check if user has admin privileges
const adminMiddleware = (req, res, next) => {
  // TODO: Implement proper admin role checking
  // For now, check if user has admin username or specific admin field
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// --- CONTENT CURATION ROUTES ---

// @route   GET /api/admin/content/dashboard
// @desc    Get content dashboard with stats and recent imports
// @access  Admin
router.get('/content/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Get recent public recipes
    const { recipes: recentRecipes } = await getPublicRecipes(10);
    
    // Get recent public collections
    const { collections: recentCollections } = await getPublicRecipeCollections(10);
    
    // TODO: Add analytics queries for actual stats
    const stats = {
      totalPublicRecipes: recentRecipes.length, // Placeholder
      totalPublicCollections: recentCollections.length, // Placeholder
      totalImports: 0, // TODO: Query by importId
      recentActivity: []
    };
    
    res.json({
      stats,
      recentRecipes: recentRecipes.slice(0, 5),
      recentCollections: recentCollections.slice(0, 5)
    });
    
  } catch (error) {
    console.error('Error fetching admin dashboard:', error.message);
    res.status(500).json({ message: 'Failed to load admin dashboard' });
  }
});

// @route   POST /api/admin/content/featured-collections
// @desc    Create or update featured collections
// @access  Admin
router.post('/featured-collections', authMiddleware, adminMiddleware, async (req, res) => {
  const { collections } = req.body;
  
  if (!Array.isArray(collections)) {
    return res.status(400).json({ message: 'Collections array is required' });
  }
  
  try {
    const authorId = `USER#${req.user.id}`;
    const authorUsername = req.user.username;
    
    const featuredCollections = [];
    
    for (const collectionData of collections) {
      const collectionInfo = {
        name: collectionData.name,
        description: collectionData.description,
        recipes: collectionData.recipes || [],
        isPublic: true,
        isFeatured: true,
        featuredOrder: collectionData.order || 0,
        featuredCategory: collectionData.category || 'general'
      };
      
      const newCollection = await createRecipeCollection({
        collectionData: collectionInfo,
        authorId,
        authorUsername
      });
      
      featuredCollections.push(newCollection);
    }
    
    res.json({
      message: `Created ${featuredCollections.length} featured collections`,
      collections: featuredCollections
    });
    
  } catch (error) {
    console.error('Error creating featured collections:', error.message);
    res.status(500).json({ message: 'Failed to create featured collections' });
  }
});

// @route   PUT /api/admin/content/featured-collections/:id
// @desc    Update featured collection
// @access  Admin
router.put('/featured-collections/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const collectionId = req.params.id;
  const { isFeatured, featuredOrder, featuredCategory } = req.body;
  
  try {
    const authorId = `USER#${req.user.id}`;
    
    const updateData = {};
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (featuredOrder !== undefined) updateData.featuredOrder = featuredOrder;
    if (featuredCategory !== undefined) updateData.featuredCategory = featuredCategory;
    
    const updatedCollection = await updateRecipeCollection(collectionId, authorId, updateData);
    
    res.json(updatedCollection);
    
  } catch (error) {
    console.error('Error updating featured collection:', error.message);
    res.status(500).json({ message: 'Failed to update featured collection' });
  }
});

// @route   GET /api/admin/content/moderation-queue
// @desc    Get content that needs moderation
// @access  Admin
router.get('/content/moderation-queue', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Get recently imported public content
    const { recipes } = await getPublicRecipes(50);
    
    // Filter for content that needs moderation (recently imported, flagged, etc.)
    const moderationQueue = recipes
      .filter(recipe => recipe.importId || recipe.needsModeration)
      .slice(0, 20);
    
    res.json({
      items: moderationQueue,
      total: moderationQueue.length
    });
    
  } catch (error) {
    console.error('Error fetching moderation queue:', error.message);
    res.status(500).json({ message: 'Failed to load moderation queue' });
  }
});

// @route   PUT /api/admin/content/moderate/:type/:id
// @desc    Moderate content (approve, reject, edit)
// @access  Admin
router.put('/content/moderate/:type/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { type, id } = req.params;
  const { action, reason, updates } = req.body;
  
  if (!['recipe', 'collection'].includes(type)) {
    return res.status(400).json({ message: 'Invalid content type' });
  }
  
  if (!['approve', 'reject', 'edit'].includes(action)) {
    return res.status(400).json({ message: 'Invalid moderation action' });
  }
  
  try {
    const authorId = `USER#${req.user.id}`;
    
    let result;
    
    if (type === 'recipe') {
      switch (action) {
        case 'approve':
          result = await updateRecipe(id, authorId, { 
            isPublic: true, 
            moderationStatus: 'approved',
            moderatedBy: req.user.username,
            moderatedAt: new Date().toISOString()
          });
          break;
        case 'reject':
          result = await updateRecipe(id, authorId, { 
            isPublic: false, 
            moderationStatus: 'rejected',
            moderationReason: reason,
            moderatedBy: req.user.username,
            moderatedAt: new Date().toISOString()
          });
          break;
        case 'edit':
          result = await updateRecipe(id, authorId, {
            ...updates,
            moderationStatus: 'edited',
            moderatedBy: req.user.username,
            moderatedAt: new Date().toISOString()
          });
          break;
      }
    } else {
      // Handle collection moderation
      switch (action) {
        case 'approve':
          result = await updateRecipeCollection(id, authorId, { 
            isPublic: true, 
            moderationStatus: 'approved',
            moderatedBy: req.user.username,
            moderatedAt: new Date().toISOString()
          });
          break;
        case 'reject':
          result = await updateRecipeCollection(id, authorId, { 
            isPublic: false, 
            moderationStatus: 'rejected',
            moderationReason: reason,
            moderatedBy: req.user.username,
            moderatedAt: new Date().toISOString()
          });
          break;
        case 'edit':
          result = await updateRecipeCollection(id, authorId, {
            ...updates,
            moderationStatus: 'edited',
            moderatedBy: req.user.username,
            moderatedAt: new Date().toISOString()
          });
          break;
      }
    }
    
    res.json({
      message: `${type} ${action}ed successfully`,
      result
    });
    
  } catch (error) {
    console.error('Error moderating content:', error.message);
    res.status(500).json({ message: 'Failed to moderate content' });
  }
});

// @route   POST /api/admin/content/bulk-moderate
// @desc    Bulk moderate multiple items
// @access  Admin
router.post('/content/bulk-moderate', authMiddleware, adminMiddleware, async (req, res) => {
  const { items, action, reason } = req.body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Items array is required' });
  }
  
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid bulk action' });
  }
  
  try {
    const authorId = `USER#${req.user.id}`;
    const results = {
      successful: [],
      failed: []
    };
    
    for (const item of items) {
      try {
        const updateData = {
          moderationStatus: action + 'd',
          moderatedBy: req.user.username,
          moderatedAt: new Date().toISOString()
        };
        
        if (action === 'approve') {
          updateData.isPublic = true;
        } else {
          updateData.isPublic = false;
          updateData.moderationReason = reason;
        }
        
        let result;
        if (item.type === 'recipe') {
          result = await updateRecipe(item.id, authorId, updateData);
        } else {
          result = await updateRecipeCollection(item.id, authorId, updateData);
        }
        
        results.successful.push({
          id: item.id,
          type: item.type,
          action
        });
        
      } catch (error) {
        results.failed.push({
          id: item.id,
          type: item.type,
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Bulk moderation completed. ${results.successful.length} items ${action}ed, ${results.failed.length} failed.`,
      results
    });
    
  } catch (error) {
    console.error('Error bulk moderating:', error.message);
    res.status(500).json({ message: 'Failed to bulk moderate content' });
  }
});

// @route   DELETE /api/admin/content/:type/:id
// @desc    Delete content as admin
// @access  Admin
router.delete('/content/:type/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { type, id } = req.params;
  const { reason } = req.body;
  
  if (!['recipe', 'collection'].includes(type)) {
    return res.status(400).json({ message: 'Invalid content type' });
  }
  
  try {
    const authorId = `USER#${req.user.id}`;
    
    if (type === 'recipe') {
      await deleteRecipe(id, authorId);
    } else {
      await deleteRecipeCollection(id, authorId);
    }
    
    // TODO: Log admin deletion action
    console.log(`Admin ${req.user.username} deleted ${type} ${id}. Reason: ${reason || 'Not specified'}`);
    
    res.json({
      message: `${type} deleted successfully`
    });
    
  } catch (error) {
    console.error('Error deleting content as admin:', error.message);
    res.status(500).json({ message: 'Failed to delete content' });
  }
});

module.exports = router;