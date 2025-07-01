const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createMealPlanEntry,
  getMealPlanEntriesForUserAndDate,
  getMealPlanEntriesForUserAndDateRange,
  updateMealPlanEntryById, // Assuming this might be needed later, though not in current routes
  deleteMealPlanEntryById,
  getMealPlanEntryById // To fetch for delete/update authorization
} = require('../models/MealPlan');
const { getRecipeById } = require('../models/Recipe'); // To verify recipe existence

// Helper to format date to YYYY-MM-DD string
const formatDateToYYYYMMDD = (date) => {
  // If date is already a YYYY-MM-DD string, return it as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @route   POST /api/mealplans
// @desc    Add a recipe to a meal plan slot
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  const { date, mealType, recipeId, plannedServings } = req.body;
  const userId = req.user.id;

  console.log('[MealPlanner] Adding meal:', { date, mealType, userId });

  // TODO: Add comprehensive validation for date format, mealType enum, recipeId format, plannedServings
  if (!date || !mealType || !recipeId || plannedServings === undefined) {
    return res.status(400).json({ message: 'Please provide date, meal type, recipe ID, and planned servings.' });
  }
  const servings = parseInt(plannedServings);
  if (isNaN(servings) || servings < 1) {
    return res.status(400).json({ message: 'Planned servings must be a positive number.' });
  }

  try {
    // Verify the recipe exists
    const plainRecipeId = recipeId.startsWith('RECIPE#') ? recipeId.substring(7) : recipeId;
    console.log('[MealPlanner] Looking up recipe with ID:', plainRecipeId);
    console.log('[MealPlanner] Original recipeId from request:', recipeId);
    
    const recipe = await getRecipeById(plainRecipeId);
    console.log('[MealPlanner] Recipe lookup result:', recipe ? 'FOUND' : 'NOT FOUND');
    
    if (recipe) {
      console.log('[MealPlanner] Recipe details:', {
        name: recipe.name,
        recipeId: recipe.recipeId,
        isPublic: recipe.isPublic,
        authorId: recipe.authorId,
        ingredientsCount: recipe.ingredients?.length || 0
      });
      console.log('[MealPlanner] Recipe ingredients:', recipe.ingredients?.map(ing => `${ing.quantity} ${ing.unit} ${ing.name}`) || 'NO INGREDIENTS');
    }
    
    if (!recipe) {
      console.log('[MealPlanner] Recipe not found for ID:', plainRecipeId);
      return res.status(404).json({ message: 'Recipe not found.' });
    }
    // Optional: If recipes are strictly private, ensure user owns it or it's public
    // if (!recipe.isPublic && recipe.authorId !== `USER#${userId}`) {
    //   return res.status(403).json({ message: 'User does not own this recipe or recipe is not public.' });
    // }

    const finalRecipeId = recipe.recipeId.startsWith('RECIPE#') ? recipe.recipeId : `RECIPE#${recipe.recipeId}`;
    
    const newEntryData = {
      userId,
      date, // The model function will format this
      mealType,
      recipeId: finalRecipeId, // Ensure prefix
      plannedServings: servings,
    };
    
    console.log('[MealPlanner] Creating meal plan entry with data:', {
      userId,
      date,
      mealType,
      recipeId: finalRecipeId,
      plannedServings: servings,
      recipeName: recipe.name
    });

    const mealPlanEntry = await createMealPlanEntry(newEntryData);
    console.log('[MealPlanner] Successfully created meal for date:', mealPlanEntry.date);
    
    // Include recipe details in the response for immediate UI update
    // Ensure we always have a recipe object, even if lookup failed
    const safeRecipe = recipe || { 
      recipeId: plainRecipeId, 
      name: 'Recipe Loading...', 
      description: '', 
      servings: 1, 
      category: 'Other' 
    };
    
    const mealPlanWithRecipe = {
      ...mealPlanEntry,
      recipe: {
        recipeId: safeRecipe.recipeId || safeRecipe.id || plainRecipeId,
        name: safeRecipe.name || 'Recipe Loading...',
        description: safeRecipe.description || '',
        servings: safeRecipe.servings || 1,
        category: safeRecipe.category || 'Other'
      }
    };
    
    console.log('[MealPlanner] Final response recipe object:', mealPlanWithRecipe.recipe);
    
    res.status(201).json(mealPlanWithRecipe);

  } catch (err) {
    console.error('Error creating meal plan entry:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/mealplans
// @desc    Get meal plans for the logged-in user (optionally by date range, paginated)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  const { startDate, endDate, date: specificDate, limit: queryLimit } = req.query;
  const userId = req.user.id;
  const limit = parseInt(queryLimit) || 20; // Default limit
  const lastEvaluatedKey = req.query.lek ? JSON.parse(decodeURIComponent(req.query.lek)) : null;

  try {
    let result;
    if (specificDate) {
      // Fetch for a single date (pagination might not be common here, but model supports it)
      const entries = await getMealPlanEntriesForUserAndDate(userId, specificDate);
      result = { entries, lastEvaluatedKey: null }; // getMealPlanEntriesForUserAndDate doesn't return LEK currently
    } else if (startDate && endDate) {
      result = await getMealPlanEntriesForUserAndDateRange(userId, startDate, endDate, limit, lastEvaluatedKey);
    } else {
      // Default: fetch recent/upcoming (e.g., next 7 days), or require a range.
      // For now, let's require at least a startDate or specificDate for simplicity, or implement a default range.
      // Or, fetch all (not recommended without client-side limits or server-side default range)
      // Default to fetching for the current month if no specific range/date is provided.
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      result = await getMealPlanEntriesForUserAndDateRange(userId, firstDayOfMonth, lastDayOfMonth, 100, null); // Fetch up to 100 for the month
    }

    // The frontend expects a direct array of meal plan entries.
    // The result.entries already contains the cleaned-up entries.
    res.json(result.entries || []); // Send the array directly, or an empty array if undefined
  } catch (err) {
    console.error('Error fetching meal plans:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/mealplans/:id  (Here :id is mealPlanId)
// @desc    Remove a recipe from a meal plan slot
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  const mealPlanId = req.params.id;
  const userId = req.user.id;

  try {
    // The deleteMealPlanEntryById function in the model handles fetching and verifying ownership.
    await deleteMealPlanEntryById(mealPlanId, userId);
    res.json({ message: 'Meal plan entry removed successfully.' });
  } catch (err) {
    console.error('Error deleting meal plan entry:', err.message);
    if (err.message.includes("not found or user not authorized")) {
        return res.status(404).json({ message: err.message });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/mealplans/copy
// @desc    Copy meal plan entries from a source date range to a destination start date
// @access  Private
router.post('/copy', authMiddleware, async (req, res) => {
  const { sourceStartDate, sourceEndDate, destinationStartDate } = req.body;
  const userId = req.user.id;

  // TODO: Add robust date validation
  if (!sourceStartDate || !sourceEndDate || !destinationStartDate) {
    return res.status(400).json({ message: 'Source start date, source end date, and destination start date are required.' });
  }

  try {
    const sStartDate = new Date(sourceStartDate);
    const sEndDate = new Date(sourceEndDate);
    const dStartDate = new Date(destinationStartDate);

    if (sEndDate < sStartDate) {
      return res.status(400).json({ message: 'Source end date cannot be before source start date.' });
    }

    // Fetch all entries in the source range (pagination might be needed for very large ranges)
    let allSourceEntries = [];
    let lastKey = null;
    do {
      const { entries, lastEvaluatedKey } = await getMealPlanEntriesForUserAndDateRange(userId, sStartDate, sEndDate, 100, lastKey);
      allSourceEntries.push(...entries);
      lastKey = lastEvaluatedKey;
    } while (lastKey);


    if (allSourceEntries.length === 0) {
      return res.status(200).json({ message: 'No meal plan entries found in the source date range to copy.', copiedCount: 0 });
    }

    const newMealPlanEntriesData = allSourceEntries.map(entry => {
      // Use local date strings to avoid timezone issues
      const sourceEntryDate = new Date(entry.date + "T00:00:00");
      const sourceStartDate = new Date(formatDateToYYYYMMDD(sStartDate) + "T00:00:00");
      const timeDiff = sourceEntryDate.getTime() - sourceStartDate.getTime();
      const dayOffset = Math.floor(timeDiff / (1000 * 3600 * 24));

      // Calculate new date by adding offset to destination start date
      const destStartDate = new Date(formatDateToYYYYMMDD(dStartDate) + "T00:00:00");
      const newEntryDate = new Date(destStartDate.getTime() + (dayOffset * 24 * 60 * 60 * 1000));

      return {
        userId,
        date: formatDateToYYYYMMDD(newEntryDate),
        mealType: entry.mealType,
        recipeId: entry.recipeId,
        plannedServings: entry.plannedServings,
      };
    });

    // TODO: Consider using BatchWriteItem for performance if creating many entries.
    // createMealPlanEntry does individual Puts with ConditionChecks, which is safer but slower in batch.
    let createdCount = 0;
    for (const entryData of newMealPlanEntriesData) {
      try {
        await createMealPlanEntry(entryData);
        createdCount++;
      } catch (indivErr) {
        console.warn(`Skipping copy for one entry due to error: ${indivErr.message}`, entryData);
      }
    }

    res.status(201).json({
      message: `${createdCount} meal plan entries copied successfully.`,
      copiedCount: createdCount,
      totalAttempted: newMealPlanEntriesData.length
    });

  } catch (err) {
    console.error('Error copying meal plan entries:', err.message, err.stack);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
