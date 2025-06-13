const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const MealPlan = require('../models/MealPlan');
const Recipe = require('../models/Recipe'); // To verify recipe ownership if needed

// @route   POST /api/mealplans
// @desc    Add a recipe to a meal plan slot
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  const { date, mealType, recipeId, plannedServings } = req.body;

  if (!date || !mealType || !recipeId || !plannedServings) {
    return res.status(400).json({ message: 'Please provide date, meal type, recipe ID, and planned servings.' });
  }
  if (isNaN(parseInt(plannedServings)) || parseInt(plannedServings) < 1) {
    return res.status(400).json({ message: 'Planned servings must be a positive number.' });
  }

  try {
    // Optional: Verify the recipe exists and belongs to the user or is public
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found.' });
    }
    // If recipes are strictly private, ensure user owns it:
    // if (recipe.user.toString() !== req.user.id) {
    //   return res.status(403).json({ message: 'User does not own this recipe.' });
    // }

    const newMealPlanEntry = new MealPlan({
      user: req.user.id,
      date: new Date(date), 
      mealType,
      recipe: recipeId,
      plannedServings: parseInt(plannedServings),
    });

    const mealPlanEntry = await newMealPlanEntry.save();
    // Populate recipe details and include plannedServings in the response
    const populatedEntry = await MealPlan.findById(mealPlanEntry._id)
                                          .populate('recipe', ['name', 'image', 'servings']); // also populate default servings for recipe
    res.status(201).json(populatedEntry);

  } catch (err) {
    console.error('Error creating meal plan entry:', err.message);
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/mealplans
// @desc    Get meal plans for the logged-in user (optionally by date range)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  const query = { user: req.user.id };

  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  } else if (startDate) {
    query.date = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.date = { $lte: new Date(endDate) };
  }
  // If no dates, fetches all meal plans for the user (could be large, consider pagination later)

  try {
    const mealPlans = await MealPlan.find(query)
      .populate('recipe', ['name', 'image', 'cookingTime', 'servings']) // Populate with recipe details including default servings
      .sort({ date: 1, mealType: 1 }); 
    res.json(mealPlans);
  } catch (err) {
    console.error('Error fetching meal plans:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/mealplans/:id
// @desc    Remove a recipe from a meal plan slot
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const mealPlanEntry = await MealPlan.findById(req.params.id);

    if (!mealPlanEntry) {
      return res.status(404).json({ message: 'Meal plan entry not found.' });
    }

    // Ensure user owns the meal plan entry
    if (mealPlanEntry.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this meal plan entry.' });
    }

    await MealPlan.findByIdAndDelete(req.params.id);
    // const result = await mealPlanEntry.remove(); // Mongoose 7+ remove is different

    res.json({ message: 'Meal plan entry removed successfully.' });
  } catch (err) {
    console.error('Error deleting meal plan entry:', err.message);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Meal plan entry not found (invalid ID format).' });
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

  if (!sourceStartDate || !sourceEndDate || !destinationStartDate) {
    return res.status(400).json({ message: 'Source start date, source end date, and destination start date are required.' });
  }

  try {
    const sStartDate = new Date(new Date(sourceStartDate).setHours(0, 0, 0, 0));
    const sEndDate = new Date(new Date(sourceEndDate).setHours(23, 59, 59, 999));
    const dStartDate = new Date(new Date(destinationStartDate).setHours(0, 0, 0, 0));

    if (sEndDate < sStartDate) {
      return res.status(400).json({ message: 'Source end date cannot be before source start date.' });
    }

    const sourceEntries = await MealPlan.find({
      user: userId,
      date: { $gte: sStartDate, $lte: sEndDate }
    });

    if (sourceEntries.length === 0) {
      return res.status(200).json({ message: 'No meal plan entries found in the source date range to copy.', copiedCount: 0 });
    }

    const newMealPlanEntries = sourceEntries.map(entry => {
      const sourceEntryDate = new Date(entry.date);
      // Calculate day difference by comparing milliseconds
      const timeDiff = sourceEntryDate.getTime() - sStartDate.getTime();
      const dayOffset = Math.floor(timeDiff / (1000 * 3600 * 24)); // Get full days offset

      const newEntryDate = new Date(dStartDate);
      newEntryDate.setDate(dStartDate.getDate() + dayOffset);
      // Ensure time part is consistent if it matters, for all-day it's less critical
      newEntryDate.setHours(sourceEntryDate.getHours(), sourceEntryDate.getMinutes(), sourceEntryDate.getSeconds(), sourceEntryDate.getMilliseconds());


      return {
        user: userId,
        date: newEntryDate,
        mealType: entry.mealType,
        recipe: entry.recipe, // recipe is an ObjectId
        plannedServings: entry.plannedServings,
        // Copy other relevant fields if any, e.g., notes
      };
    });

    const createdEntries = await MealPlan.insertMany(newMealPlanEntries);
    
    // Populate recipe details for the response if needed by frontend immediately
    const populatedCreatedEntries = await MealPlan.find({ _id: { $in: createdEntries.map(e => e._id) } })
                                                .populate('recipe', ['name', 'image', 'servings']);


    res.status(201).json({ 
      message: `${populatedCreatedEntries.length} meal plan entries copied successfully.`,
      copiedCount: populatedCreatedEntries.length,
      // newEntries: populatedCreatedEntries // Optionally send back the new entries
    });

  } catch (err) {
    console.error('Error copying meal plan entries:', err.message, err.stack);
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
