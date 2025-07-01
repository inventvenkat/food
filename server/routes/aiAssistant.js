const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const AIRecipeParser = require('../utils/aiRecipeParser');
const { getRecipeById, getRecipesByAuthor } = require('../models/Recipe');
const { getMealPlanEntriesForUserAndDateRange, createMealPlanEntry } = require('../models/MealPlan');
const { getPublicRecipes, searchPublicRecipes } = require('../models/Recipe');

// Initialize AI service
const aiService = new AIRecipeParser();

// @route   POST /api/ai-assistant/chat
// @desc    Handle AI assistant chat messages
// @access  Private
router.post('/chat', authMiddleware, async (req, res) => {
  const { message, context } = req.body;
  const userId = req.user.id;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Message is required and must be a non-empty string' 
    });
  }

  try {
    // Build context for AI assistant
    const assistantContext = await buildUserContext(userId, context);
    
    // Check if the message contains an action request
    const actionResult = await detectAndExecuteAction(message, userId, assistantContext);
    
    if (actionResult.actionExecuted) {
      // Return the action result with AI explanation
      const aiResponse = await generateAIResponse(
        `Explain what was just done: ${actionResult.explanation}. Be brief and encouraging.`, 
        assistantContext, 
        aiService
      );
      
      res.json({
        success: true,
        response: `✅ ${actionResult.message}\n\n${aiResponse}`,
        actionExecuted: true,
        actionType: actionResult.actionType,
        actionData: actionResult.data,
        timestamp: new Date().toISOString()
      });
    } else {
      // Generate regular AI response
      const aiResponse = await generateAIResponseWithActions(message, assistantContext, aiService, userId);
      
      res.json({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('AI Assistant Error:', error);
    res.status(500).json({
      success: false,
      error: 'I apologize, but I\'m having trouble responding right now. Please try again in a moment.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/ai-assistant/suggest-recipes
// @desc    Get AI-powered recipe suggestions
// @access  Private  
router.post('/suggest-recipes', authMiddleware, async (req, res) => {
  const { ingredients, dietary_restrictions, cuisine_type, cooking_time } = req.body;
  const userId = req.user.id;

  try {
    // Get user's recipe collection for personalized suggestions
    const { recipes: userRecipes } = await getRecipesByAuthor(userId, 50);
    
    const prompt = buildRecipeSuggestionPrompt(ingredients, dietary_restrictions, cuisine_type, cooking_time, userRecipes);
    const suggestions = await generateAIResponse(prompt, {}, aiService);
    
    res.json({
      success: true,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recipe Suggestion Error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to generate recipe suggestions at the moment.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/ai-assistant/cooking-help
// @desc    Get cooking assistance and troubleshooting
// @access  Private
router.post('/cooking-help', authMiddleware, async (req, res) => {
  const { question, recipe_id, step_number } = req.body;
  const userId = req.user.id;

  try {
    let context = {};
    
    // If recipe_id is provided, get recipe details for context
    if (recipe_id) {
      const recipe = await getRecipeById(recipe_id);
      if (recipe && (recipe.isPublic || recipe.authorId === `USER#${userId}`)) {
        context.recipe = {
          name: recipe.name,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          servings: recipe.servings,
          cookingTime: recipe.cookingTime
        };
        context.currentStep = step_number;
      }
    }

    const prompt = buildCookingHelpPrompt(question, context);
    const helpResponse = await generateAIResponse(prompt, context, aiService);
    
    res.json({
      success: true,
      response: helpResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cooking Help Error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to provide cooking assistance at the moment.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to build user context
async function buildUserContext(userId, additionalContext = {}) {
  const context = {
    userId,
    timestamp: new Date().toISOString(),
    ...additionalContext
  };

  try {
    // Get user's recent recipes (for personalization)
    const { recipes: recentRecipes } = await getRecipesByAuthor(userId, 10);
    context.userRecipes = recentRecipes.map(recipe => ({
      id: recipe.recipeId,
      name: recipe.name,
      category: recipe.category,
      tags: recipe.tags
    }));

    // Get recent meal plans (for meal planning assistance)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    
    const { entries: mealPlans } = await getMealPlanEntriesForUserAndDateRange(
      userId, 
      oneWeekAgo.toISOString().split('T')[0], 
      oneWeekFromNow.toISOString().split('T')[0], 
      50
    );
    
    context.recentMealPlans = mealPlans.map(plan => ({
      date: plan.date,
      mealType: plan.mealType,
      recipeName: plan.recipe?.name || 'Unknown Recipe',
      servings: plan.plannedServings
    }));

  } catch (error) {
    console.error('Error building user context:', error);
    // Continue without user context if there's an error
  }

  return context;
}

// Helper function to generate AI responses
async function generateAIResponse(message, context, aiService) {
  const systemPrompt = `You are a helpful AI assistant for RecipeApp, a recipe management and meal planning application. You help users with:

1. Recipe suggestions and recommendations
2. Cooking tips and techniques  
3. Meal planning and organization
4. Ingredient substitutions
5. Nutritional information
6. Kitchen troubleshooting

Guidelines:
- Be helpful, friendly, and encouraging
- Provide practical, actionable advice
- Keep responses concise but informative
- Use cooking emojis occasionally to be engaging
- If you need more information, ask clarifying questions
- Reference the user's existing recipes and meal plans when relevant

${context.userRecipes ? `User's recent recipes: ${context.userRecipes.map(r => r.name).join(', ')}` : ''}
${context.recentMealPlans ? `User's recent meal plans: ${context.recentMealPlans.map(p => `${p.date}: ${p.mealType} - ${p.recipeName}`).join(', ')}` : ''}`;

  const fullPrompt = `${systemPrompt}\n\nUser message: ${message}`;

  try {
    // Use the existing AI service to generate response
    const response = await aiService.generateResponse(fullPrompt);
    return response;
  } catch (error) {
    console.error('AI Service Error:', error);
    
    // Fallback responses based on message content
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('recipe') || lowerMessage.includes('cook')) {
      return "I'd be happy to help you with recipes and cooking! What specific dish or type of cuisine are you interested in? I can suggest recipes based on ingredients you have or help with cooking techniques.";
    } else if (lowerMessage.includes('meal plan')) {
      return "Great! I can help you plan your meals. Tell me about your preferences - how many people you're cooking for, any dietary restrictions, and what types of meals you enjoy. I'll help create a balanced weekly plan!";
    } else if (lowerMessage.includes('ingredient') || lowerMessage.includes('substitute')) {
      return "I can definitely help with ingredient substitutions! What ingredient are you looking to replace, and I'll suggest some alternatives that will work well in your recipe.";
    } else {
      return "I'm here to help with all your cooking and recipe needs! Feel free to ask me about recipe suggestions, meal planning, cooking tips, or any kitchen questions you have. How can I assist you today? 🍳";
    }
  }
}

// Helper function to build recipe suggestion prompt
function buildRecipeSuggestionPrompt(ingredients, dietaryRestrictions, cuisineType, cookingTime, userRecipes) {
  let prompt = "Suggest 3-5 recipes based on the following criteria:\n\n";
  
  if (ingredients && ingredients.length > 0) {
    prompt += `Available ingredients: ${ingredients.join(', ')}\n`;
  }
  
  if (dietaryRestrictions && dietaryRestrictions.length > 0) {
    prompt += `Dietary restrictions: ${dietaryRestrictions.join(', ')}\n`;
  }
  
  if (cuisineType) {
    prompt += `Preferred cuisine: ${cuisineType}\n`;
  }
  
  if (cookingTime) {
    prompt += `Available cooking time: ${cookingTime}\n`;
  }
  
  if (userRecipes && userRecipes.length > 0) {
    prompt += `\nUser's favorite recipe types (for personalization): ${userRecipes.map(r => r.name).slice(0, 5).join(', ')}\n`;
  }
  
  prompt += "\nPlease provide recipe suggestions with brief descriptions and why they match the criteria. Format as a numbered list.";
  
  return prompt;
}

// Helper function to build cooking help prompt
function buildCookingHelpPrompt(question, context) {
  let prompt = `Cooking Question: ${question}\n\n`;
  
  if (context.recipe) {
    prompt += `Context - Current Recipe: ${context.recipe.name}\n`;
    prompt += `Ingredients: ${context.recipe.ingredients.map(ing => `${ing.quantity || ing.amount} ${ing.unit} ${ing.name}`).join(', ')}\n`;
    prompt += `Instructions: ${context.recipe.instructions}\n`;
    
    if (context.currentStep) {
      prompt += `Current step: ${context.currentStep}\n`;
    }
  }
  
  prompt += "\nPlease provide helpful, specific advice for this cooking question. Include tips and troubleshooting if relevant.";
  
  return prompt;
}

// Action Detection and Execution Functions

async function detectAndExecuteAction(message, userId, context) {
  const lowerMessage = message.toLowerCase();
  
  // Detect action patterns
  if (isAddMealPlanAction(lowerMessage)) {
    return await executeAddMealPlanAction(message, userId, context);
  } else if (isSearchRecipeAction(lowerMessage)) {
    return await executeSearchRecipeAction(message, userId, context);
  } else if (isCreateRecipeAction(lowerMessage)) {
    return await executeCreateRecipeAction(message, userId, context);
  }
  
  return { actionExecuted: false };
}

function isAddMealPlanAction(message) {
  const actionWords = ['add', 'schedule', 'plan', 'put'];
  const mealWords = ['meal', 'breakfast', 'lunch', 'dinner', 'snack'];
  const timeWords = ['tomorrow', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'next week'];
  
  const hasAction = actionWords.some(word => message.includes(word));
  const hasMeal = mealWords.some(word => message.includes(word));
  const hasTime = timeWords.some(word => message.includes(word));
  
  return hasAction && (hasMeal || hasTime);
}

function isSearchRecipeAction(message) {
  const searchWords = ['find', 'search', 'look for', 'show me', 'suggest'];
  const recipeWords = ['recipe', 'dish', 'meal', 'food'];
  
  const hasSearch = searchWords.some(word => message.includes(word));
  const hasRecipe = recipeWords.some(word => message.includes(word));
  
  return hasSearch && hasRecipe;
}

function isCreateRecipeAction(message) {
  const createWords = ['create', 'make', 'add', 'new'];
  const recipeWords = ['recipe'];
  
  const hasCreate = createWords.some(word => message.includes(word));
  const hasRecipe = recipeWords.some(word => message.includes(word));
  
  return hasCreate && hasRecipe && message.includes('recipe');
}

async function executeAddMealPlanAction(message, userId, context) {
  try {
    // Extract meal plan details from message
    const mealPlanData = extractMealPlanData(message, context);
    
    if (!mealPlanData.recipeId) {
      // Need to find a recipe first
      const recipeSearchResult = await findRecipeForMealPlan(message, userId);
      if (!recipeSearchResult.success) {
        return {
          actionExecuted: false,
          message: "I couldn't find a suitable recipe. Please be more specific about what dish you'd like to add."
        };
      }
      mealPlanData.recipeId = recipeSearchResult.recipeId;
      mealPlanData.recipeName = recipeSearchResult.recipeName;
    }
    
    // Create the meal plan entry
    const newMealPlan = await createMealPlanEntry({
      userId,
      date: mealPlanData.date,
      mealType: mealPlanData.mealType,
      recipeId: mealPlanData.recipeId,
      plannedServings: mealPlanData.servings || 2
    });
    
    return {
      actionExecuted: true,
      actionType: 'add_meal_plan',
      message: `Added ${mealPlanData.recipeName || 'recipe'} to your ${mealPlanData.mealType.toLowerCase()} on ${mealPlanData.date}!`,
      explanation: `Added a meal plan entry for ${mealPlanData.mealType} on ${mealPlanData.date}`,
      data: {
        mealPlanId: newMealPlan.mealPlanId,
        date: mealPlanData.date,
        mealType: mealPlanData.mealType,
        recipeName: mealPlanData.recipeName
      }
    };
    
  } catch (error) {
    console.error('Error executing add meal plan action:', error);
    return {
      actionExecuted: false,
      message: "Sorry, I couldn't add that to your meal plan. Please try again."
    };
  }
}

async function executeSearchRecipeAction(message, userId, context) {
  try {
    // Extract search terms from message
    const searchTerms = extractSearchTerms(message);
    
    // Search for recipes
    const searchResult = await searchPublicRecipes(searchTerms.join(' '), 5);
    
    if (searchResult.recipes.length === 0) {
      return {
        actionExecuted: false,
        message: "I couldn't find any recipes matching your search. Try different keywords."
      };
    }
    
    // Format recipe results
    const recipeList = searchResult.recipes.map((recipe, index) => 
      `${index + 1}. **${recipe.name}** - ${recipe.description || 'No description available'}`
    ).join('\n');
    
    return {
      actionExecuted: true,
      actionType: 'search_recipes',
      message: `Here are ${searchResult.recipes.length} recipes I found:\n\n${recipeList}`,
      explanation: `Searched for recipes matching: ${searchTerms.join(', ')}`,
      data: {
        searchTerms,
        recipes: searchResult.recipes
      }
    };
    
  } catch (error) {
    console.error('Error executing search recipe action:', error);
    return {
      actionExecuted: false,
      message: "Sorry, I couldn't search for recipes right now. Please try again."
    };
  }
}

async function executeCreateRecipeAction(message, userId, context) {
  // For now, just provide guidance on creating recipes
  return {
    actionExecuted: true,
    actionType: 'create_recipe_guidance',
    message: "I'd love to help you create a recipe! You can:\n\n• Go to the Create Recipe page to add a new recipe\n• Use the LLM-assisted recipe creation feature\n• Upload a recipe document for parsing\n\nWould you like me to guide you through any of these options?",
    explanation: "Provided guidance on recipe creation",
    data: {
      action: 'guidance'
    }
  };
}

// Helper functions

function extractMealPlanData(message, context) {
  const data = {
    date: extractDate(message),
    mealType: extractMealType(message),
    servings: extractServings(message),
    recipeId: null,
    recipeName: null
  };
  
  return data;
}

function extractDate(message) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  if (message.includes('tomorrow')) {
    return tomorrow.toISOString().split('T')[0];
  } else if (message.includes('today')) {
    return today.toISOString().split('T')[0];
  }
  
  // Check for day names
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of days) {
    if (message.includes(day)) {
      const targetDate = getNextDateForDay(day);
      return targetDate.toISOString().split('T')[0];
    }
  }
  
  // Default to tomorrow
  return tomorrow.toISOString().split('T')[0];
}

function extractMealType(message) {
  if (message.includes('breakfast')) return 'Breakfast';
  if (message.includes('lunch')) return 'Lunch';
  if (message.includes('dinner')) return 'Dinner';
  if (message.includes('snack')) return 'Snack';
  
  // Default to dinner
  return 'Dinner';
}

function extractServings(message) {
  const servingMatch = message.match(/(\d+)\s*(serving|portion|people)/);
  return servingMatch ? parseInt(servingMatch[1]) : 2;
}

function extractSearchTerms(message) {
  // Remove common action words and extract search terms
  const stopWords = ['find', 'search', 'look', 'for', 'show', 'me', 'recipe', 'recipes', 'dish', 'food', 'meal'];
  const words = message.toLowerCase().split(/\s+/);
  
  return words.filter(word => 
    word.length > 2 && 
    !stopWords.includes(word) &&
    !word.match(/^(a|an|the|and|or|but|with|for|to|of|in|on|at)$/)
  );
}

function getNextDateForDay(dayName) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = days.indexOf(dayName.toLowerCase());
  
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntilTarget = (dayIndex + 7 - currentDay) % 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
  
  return targetDate;
}

async function findRecipeForMealPlan(message, userId) {
  try {
    // Extract potential recipe name from message
    const words = message.toLowerCase().split(/\s+/);
    const potentialRecipeName = words.filter(word => 
      word.length > 3 && 
      !['breakfast', 'lunch', 'dinner', 'snack', 'tomorrow', 'today', 'add', 'schedule', 'plan'].includes(word)
    ).join(' ');
    
    if (potentialRecipeName.length < 3) {
      return { success: false };
    }
    
    // Search user's recipes first
    const { recipes: userRecipes } = await getRecipesByAuthor(userId, 20);
    const userMatch = userRecipes.find(recipe => 
      recipe.name.toLowerCase().includes(potentialRecipeName)
    );
    
    if (userMatch) {
      return {
        success: true,
        recipeId: `RECIPE#${userMatch.recipeId}`,
        recipeName: userMatch.name
      };
    }
    
    // Search public recipes
    const searchResult = await searchPublicRecipes(potentialRecipeName, 5);
    if (searchResult.recipes.length > 0) {
      const bestMatch = searchResult.recipes[0];
      return {
        success: true,
        recipeId: `RECIPE#${bestMatch.recipeId}`,
        recipeName: bestMatch.name
      };
    }
    
    return { success: false };
  } catch (error) {
    console.error('Error finding recipe for meal plan:', error);
    return { success: false };
  }
}

// Enhanced AI response function with action suggestions
async function generateAIResponseWithActions(message, context, aiService, userId) {
  const systemPrompt = `You are a helpful AI assistant for RecipeApp. You can help with recipes, cooking, meal planning, and more.

IMPORTANT: When users ask you to perform actions (like "add chicken pasta to tomorrow's dinner"), tell them that you CAN help with that and encourage them to be specific. For example:
- "I can help you add meals to your meal planner! Just tell me the dish name and when you want it scheduled."
- "I can search for recipes for you! What type of dish are you looking for?"

Current user context:
${context.userRecipes ? `User's recent recipes: ${context.userRecipes.slice(0, 5).map(r => r.name).join(', ')}` : ''}
${context.recentMealPlans ? `Recent meal plans: ${context.recentMealPlans.slice(0, 3).map(p => `${p.date}: ${p.mealType} - ${p.recipeName}`).join(', ')}` : ''}

Guidelines:
- Be helpful, friendly, and encouraging
- Suggest specific actions the user can take
- Reference their existing recipes when relevant
- Use cooking emojis occasionally
- Keep responses concise but informative`;

  const fullPrompt = `${systemPrompt}\n\nUser message: ${message}`;

  try {
    return await aiService.generateResponse(fullPrompt);
  } catch (error) {
    console.error('AI Service Error:', error);
    return "I'm here to help with recipes, meal planning, and cooking! I can add meals to your planner, search for recipes, and provide cooking advice. What would you like to do? 🍳";
  }
}

module.exports = router;