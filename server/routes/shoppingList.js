const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Recipe = require('../models/Recipe');
const MealPlan = require('../models/MealPlan'); // Import MealPlan model

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

// Helper function to parse and scale quantity
// Tries to handle "1/2", "0.5", "1", "1-2", "1 pinch"
function parseAndScaleQuantity(quantityStr, scaleFactor) {
  if (typeof quantityStr !== 'string' && typeof quantityStr !== 'number') {
    // If it's not a string or number (e.g. undefined, null from bad data), return as is or a default
    return quantityStr || ''; 
  }
  if (scaleFactor === 1) return String(quantityStr); // No scaling needed

  let quantity = String(quantityStr).toLowerCase().trim();
  let numericPart = null;
  let textPart = '';

  // Handle "a pinch", "an egg" -> "1 pinch", "1 egg" for scaling
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
    textPart = quantity.replace(/^(\d+)\s*-\s*(\d+)/, '').trim(); // Get text after range
    return `${Number(scaledMin.toFixed(2))}-${Number(scaledMax.toFixed(2))}${textPart ? ' ' + textPart : ''}`;
  } else if (decimalMatch) {
    numericPart = parseFloat(decimalMatch[1]);
    textPart = quantity.substring(decimalMatch[1].length).trim();
  } else {
    // No number at the start, might be just text or text with number later (e.g. "eggs 2") - not handled here
    textPart = quantity;
  }

  if (numericPart !== null) {
    const scaledNumericPart = numericPart * scaleFactor;
    const finalNumeric = Number(scaledNumericPart.toFixed(2)); 
    // If original textPart was empty and finalNumeric is integer, display as integer
    if (textPart === '' && Number.isInteger(finalNumeric)) {
        return String(parseInt(finalNumeric, 10));
    }
    return `${finalNumeric}${textPart ? ' ' + textPart : ''}`;
  }
  
  // If it was purely text like "to taste", return as is.
  // If it was like "pinch" and scaleFactor is > 1, return "X pinches"
  if (textPart === quantity && !textPart.match(/^\d/)) { // Purely text
      if ((textPart === "pinch" || textPart === "clove") && scaleFactor > 1 && Number.isInteger(scaleFactor)) {
          return `${parseInt(scaleFactor, 10)} ${textPart}${scaleFactor > 1 ? 's' : ''}`;
      }
      return quantityStr; // Return original for "to taste" etc.
  }
  
  return quantityStr; // Fallback
}

// @route   POST /api/shopping-list/generate
// @desc    Generate a shopping list for a given date range from meal plan
// @access  Private
router.post('/generate', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.body; 

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Please provide both start and end dates.' });
  }

  try {
    const mealPlanQuery = {
      user: req.user.id,
      date: {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)), // Start of the startDate
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) // End of the endDate
      }
    };
    
    const mealPlanEntries = await MealPlan.find(mealPlanQuery)
      .populate({
          path: 'recipe', // Populate the recipe for each meal plan entry
          populate: { path: 'ingredients' } // Ensure ingredients are populated within the recipe object
      });

    if (mealPlanEntries.length === 0) {
      return res.status(200).json({}); // Return empty list if no meals in range
    }

    const aggregatedIngredients = {};

    mealPlanEntries.forEach(entry => {
      if (!entry.recipe || !entry.recipe.ingredients || !entry.recipe.servings || !entry.plannedServings) {
        console.warn(`Skipping meal plan entry ${entry._id} due to missing critical data (recipe, ingredients, recipe.servings, or plannedServings).`);
        return; 
      }

      const recipeDefaultServings = entry.recipe.servings;
      if (recipeDefaultServings === 0) { // Avoid division by zero
        console.warn(`Skipping recipe ${entry.recipe._id} in meal plan entry ${entry._id} due to recipe default servings being 0.`);
        return;
      }
      const scaleFactor = entry.plannedServings / recipeDefaultServings;

      entry.recipe.ingredients.forEach(ing => {
        if (!ing.name || ing.quantity === undefined || ing.unit === undefined) {
          console.warn(`Skipping ingredient in recipe ${entry.recipe._id} due to missing fields (name, quantity, or unit).`);
          return;
        }
        const scaledQuantityStr = parseAndScaleQuantity(ing.quantity, scaleFactor);
        const key = `${ing.name.toLowerCase().trim()}_${ing.unit.toLowerCase().trim()}`; // Key by name and unit

        if (aggregatedIngredients[key]) {
          const existingQtyStr = aggregatedIngredients[key].quantity;
          const currentNumeric = parseFloat(existingQtyStr);
          const newNumericAddition = parseFloat(scaledQuantityStr);

          if (!isNaN(currentNumeric) && !isNaN(newNumericAddition)) {
            // Both are numbers, sum them
            aggregatedIngredients[key].quantity = (currentNumeric + newNumericAddition).toString();
            // If original had text part, try to retain it if it makes sense (e.g. "2 cups" + "1 cup" -> "3 cups")
            // This part is tricky; for now, just sum numbers. Text part might be lost if not handled carefully.
            // The parseAndScaleQuantity should return "value unit" string.
            // We need to parse out the numeric part of existing and new scaled quantity for summing.
            const unitText = scaledQuantityStr.replace(/^[\d\.-]+/, '').trim();
            if (unitText) {
                 aggregatedIngredients[key].quantity += ` ${unitText}`;
            }

          } else {
            // If one or both are not simple numbers (e.g., "to taste", or "1 + 1/2 cup")
            aggregatedIngredients[key].quantity = `${existingQtyStr} + ${scaledQuantityStr}`;
          }
        } else {
          aggregatedIngredients[key] = {
            name: ing.name,
            quantity: scaledQuantityStr,
            unit: ing.unit,
          };
        }
      });
    });
    
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
