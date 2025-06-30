const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getRecipeById } = require('../models/Recipe'); // To fetch recipe details
const { batchGetRecipes } = require('../utils/batchLoader'); // Import batch loader
const { getMealPlanEntriesForUserAndDateRange } = require('../models/MealPlan');

// Simple ingredient to category mapping (can be expanded)
const ingredientToCategoryMap = {
  // Produce
  'onion': 'Produce', 'onions': 'Produce', 'garlic': 'Produce', 'tomato': 'Produce', 'tomatoes': 'Produce',
  'potato': 'Produce', 'potatoes': 'Produce', 'carrot': 'Produce', 'carrots': 'Produce', 'celery': 'Produce',
  'bell pepper': 'Produce', 'broccoli': 'Produce', 'spinach': 'Produce', 'lettuce': 'Produce', 'cucumber': 'Produce',
  'zucchini': 'Produce', 'mushroom': 'Produce', 'mushrooms': 'Produce', 'avocado': 'Produce', 'lemon': 'Produce',
  'lime': 'Produce', 'apple': 'Produce', 'banana': 'Produce', 'orange': 'Produce', 'berries': 'Produce',
  'grapes': 'Produce', 'cilantro': 'Produce', 'parsley': 'Produce', 'basil': 'Produce', 'ginger': 'Produce',
  // Dairy & Alternatives
  'milk': 'Dairy & Alternatives', 'cheese': 'Dairy & Alternatives', 'yogurt': 'Dairy & Alternatives',
  'butter': 'Dairy & Alternatives', 'cream': 'Dairy & Alternatives', 'sour cream': 'Dairy & Alternatives',
  'eggs': 'Dairy & Alternatives', 'almond milk': 'Dairy & Alternatives', 'soy milk': 'Dairy & Alternatives',
  // Proteins
  'chicken': 'Proteins', 'beef': 'Proteins', 'pork': 'Proteins', 'fish': 'Proteins', 'salmon': 'Proteins',
  'shrimp': 'Proteins', 'tofu': 'Proteins', 'beans': 'Proteins', 'lentils': 'Proteins', 'chickpeas': 'Proteins',
  // Pantry/Grains/Spices
  'flour': 'Pantry', 'sugar': 'Pantry', 'salt': 'Pantry', 'pepper': 'Pantry', 'olive oil': 'Pantry',
  'vegetable oil': 'Pantry', 'rice': 'Pantry', 'pasta': 'Pantry', 'bread': 'Pantry', 'oats': 'Pantry',
  'baking soda': 'Pantry', 'baking powder': 'Pantry', 'vanilla extract': 'Pantry', 'soy sauce': 'Pantry',
  'vinegar': 'Pantry', 'mustard': 'Pantry', 'ketchup': 'Pantry', 'mayonnaise': 'Pantry',
  'cumin': 'Spices', 'coriander': 'Spices', 'turmeric': 'Spices', 'paprika': 'Spices', 'oregano': 'Spices',
  'cinnamon': 'Spices', 'nutmeg': 'Spices', 'chili powder': 'Spices',
  // Other
  'water': 'Other', 'wine': 'Other', 'broth': 'Pantry', 'stock': 'Pantry'
};

const getCategory = (ingredientName) => {
  const lowerName = ingredientName.toLowerCase();
  for (const key in ingredientToCategoryMap) {
    if (lowerName.includes(key)) { // Simple substring match
      return ingredientToCategoryMap[key];
    }
  }
  return 'Other'; // Default category
};

// Helper function to parse and scale quantity (remains the same)
function parseAndScaleQuantity(quantityStr, scaleFactor) {
  if (typeof quantityStr !== 'string' && typeof quantityStr !== 'number') {
    return quantityStr || '';
  }
  if (scaleFactor === 1) return String(quantityStr);

  let quantity = String(quantityStr).toLowerCase().trim();
  let numericPart = null;
  let textPart = '';

  if (quantity.startsWith('a ') && quantity.length > 2) {
    quantity = '1 ' + quantity.substring(2);
  } else if (quantity.startsWith('an ') && quantity.length > 3) {
    quantity = '1 ' + quantity.substring(3);
  }

  const fractionMatch = quantity.match(/^(\d+)\s*\/\s*(\d+)/);
  const decimalMatch = quantity.match(/^(\d*\.?\d+)/);
  const rangeMatch = quantity.match(/^(\d+)\s*-\s*(\d+)/);

  if (fractionMatch) {
    numericPart = parseFloat(fractionMatch[1]) / parseFloat(fractionMatch[2]);
    textPart = quantity.substring(fractionMatch[0].length).trim();
  } else if (rangeMatch) {
    const scaledMin = parseFloat(rangeMatch[1]) * scaleFactor;
    const scaledMax = parseFloat(rangeMatch[2]) * scaleFactor;
    textPart = quantity.replace(/^(\d+)\s*-\s*(\d+)/, '').trim();
    return `${Number(scaledMin.toFixed(2))}-${Number(scaledMax.toFixed(2))}${textPart ? ' ' + textPart : ''}`;
  } else if (decimalMatch) {
    numericPart = parseFloat(decimalMatch[1]);
    textPart = quantity.substring(decimalMatch[1].length).trim();
  } else {
    textPart = quantity;
  }

  if (numericPart !== null) {
    const scaledNumericPart = numericPart * scaleFactor;
    const finalNumeric = Number(scaledNumericPart.toFixed(2));
    if (textPart === '' && Number.isInteger(finalNumeric)) {
        return String(parseInt(finalNumeric, 10));
    }
    return `${finalNumeric}${textPart ? ' ' + textPart : ''}`;
  }

  if (textPart === quantity && !textPart.match(/^\d/)) {
      if ((textPart === "pinch" || textPart === "clove") && scaleFactor > 1 && Number.isInteger(scaleFactor)) {
          return `${parseInt(scaleFactor, 10)} ${textPart}${scaleFactor > 1 ? 's' : ''}`;
      }
      return quantityStr;
  }
  return quantityStr;
}

// @route   POST /api/shopping-list/generate
// @desc    Generate a shopping list for a given date range from meal plan
// @access  Private
router.post('/generate', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.body;
  const userId = req.user.id;

  // TODO: Add robust date validation
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Please provide both start and end dates.' });
  }

  try {
    // Fetch all meal plan entries for the user in the date range
    // Note: getMealPlanEntriesForUserAndDateRange handles pagination internally if we fetch all.
    // For very large ranges/many entries, this might need to be batched.
    let allMealPlanEntries = [];
    let lastKey = null;
    do {
        const { entries, lastEvaluatedKey: newLek } = await getMealPlanEntriesForUserAndDateRange(userId, startDate, endDate, 100, lastKey);
        allMealPlanEntries.push(...entries);
        lastKey = newLek;
    } while (lastKey);

    if (allMealPlanEntries.length === 0) {
      return res.status(200).json({}); // Return empty object if no meals in range
    }

    const aggregatedIngredients = {};

    // Extract unique recipe IDs that are not already populated
    const recipeIdsToFetch = [];
    const entriesNeedingRecipes = [];
    
    for (const entry of allMealPlanEntries) {
      if (!entry.recipeId || !entry.plannedServings) {
        console.warn(`Skipping meal plan entry ${entry.mealPlanId} due to missing recipeId or plannedServings.`);
        continue;
      }

      // If recipe is already populated (from MealPlan optimization), use it
      if (entry.recipe) {
        continue; // Will process below with populated recipe
      }
      
      // Otherwise, track for batch loading
      const plainRecipeId = entry.recipeId.startsWith('RECIPE#') ? entry.recipeId.substring(7) : entry.recipeId;
      if (!recipeIdsToFetch.includes(plainRecipeId)) {
        recipeIdsToFetch.push(plainRecipeId);
      }
      entriesNeedingRecipes.push(entry);
    }

    // Batch load any missing recipes
    let additionalRecipes = [];
    if (recipeIdsToFetch.length > 0) {
      additionalRecipes = await batchGetRecipes(recipeIdsToFetch);
    }
    
    // Create recipe map for quick lookup
    const recipeMap = new Map();
    additionalRecipes.forEach((recipe, index) => {
      if (recipe) {
        recipeMap.set(recipeIdsToFetch[index], recipe);
      }
    });

    // Process all meal plan entries
    for (const entry of allMealPlanEntries) {
      if (!entry.recipeId || !entry.plannedServings) {
        continue; // Already logged above
      }

      let recipeDetails;
      if (entry.recipe) {
        // Recipe already populated from MealPlan optimization
        recipeDetails = entry.recipe;
      } else {
        // Get from batch loaded recipes
        const plainRecipeId = entry.recipeId.startsWith('RECIPE#') ? entry.recipeId.substring(7) : entry.recipeId;
        recipeDetails = recipeMap.get(plainRecipeId);
      }

      if (!recipeDetails || !recipeDetails.ingredients || recipeDetails.servings === undefined || recipeDetails.servings === 0) {
        console.warn(`Skipping recipe ${entry.recipeId} in meal plan entry ${entry.mealPlanId} due to missing data or zero servings.`);
        continue;
      }

      const scaleFactor = entry.plannedServings / recipeDetails.servings;

      recipeDetails.ingredients.forEach(ing => {
        if (!ing.name || ing.quantity === undefined || ing.unit === undefined) {
          console.warn(`Skipping ingredient in recipe ${recipeDetails.recipeId} due to missing fields.`);
          return;
        }
        const scaledQuantityStr = parseAndScaleQuantity(ing.quantity, scaleFactor);
        const key = `${ing.name.toLowerCase().trim()}_${ing.unit.toLowerCase().trim()}`;

        if (aggregatedIngredients[key]) {
          // Basic aggregation: sum quantities if possible, otherwise concatenate
          // This part might need more sophisticated logic for combining quantities like "1 cup" + "0.5 cup"
          // For simplicity, if both are numbers, sum. Otherwise, append.
          const existingQty = aggregatedIngredients[key].quantity;
          const currentNumeric = parseFloat(existingQty);
          const newNumericAddition = parseFloat(scaledQuantityStr);

          if (!isNaN(currentNumeric) && !isNaN(newNumericAddition)) {
            const unitText = scaledQuantityStr.replace(/^[\d\.-]+/, '').trim();
            aggregatedIngredients[key].quantity = (currentNumeric + newNumericAddition).toString() + (unitText ? ` ${unitText}` : '');
          } else {
            aggregatedIngredients[key].quantity = `${existingQty} + ${scaledQuantityStr}`;
          }
        } else {
          aggregatedIngredients[key] = {
            name: ing.name,
            quantity: scaledQuantityStr,
            unit: ing.unit,
          };
        }
      });
    }

    const shoppingListCategorized = {};
    Object.values(aggregatedIngredients).forEach(ing => {
      const category = getCategory(ing.name);
      if (!shoppingListCategorized[category]) {
        shoppingListCategorized[category] = [];
      }
      shoppingListCategorized[category].push(ing);
    });

    res.json(shoppingListCategorized);

  } catch (err) {
    console.error('Error generating shopping list:', err.message, err.stack);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
