const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003';

class AIAssistantService {
  /**
   * Send a chat message to the AI assistant
   */
  static async sendChatMessage(message, context = {}) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/api/ai-assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      return {
        success: true,
        response: data.response,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error('AI Assistant Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recipe suggestions from AI
   */
  static async getRecipeSuggestions(options = {}) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/api/ai-assistant/suggest-recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ingredients: options.ingredients || [],
          dietary_restrictions: options.dietaryRestrictions || [],
          cuisine_type: options.cuisineType || '',
          cooking_time: options.cookingTime || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get recipe suggestions');
      }

      return {
        success: true,
        suggestions: data.suggestions,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error('Recipe Suggestions Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get cooking help and assistance
   */
  static async getCookingHelp(question, recipeId = null, stepNumber = null) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/api/ai-assistant/cooking-help`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question,
          recipe_id: recipeId,
          step_number: stepNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get cooking help');
      }

      return {
        success: true,
        response: data.response,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error('Cooking Help Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user is authenticated (has token)
   */
  static isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  /**
   * Get context information for current page
   */
  static getCurrentPageContext() {
    const pathname = window.location.pathname;
    const context = {
      page: pathname,
      timestamp: new Date().toISOString()
    };

    // Add page-specific context
    if (pathname.includes('/recipes/')) {
      const recipeId = pathname.split('/recipes/')[1];
      context.currentRecipe = recipeId;
    } else if (pathname.includes('/meal-planner')) {
      context.page_type = 'meal_planning';
    } else if (pathname.includes('/shopping-list')) {
      context.page_type = 'shopping_list';
    } else if (pathname.includes('/create-recipe')) {
      context.page_type = 'recipe_creation';
    } else if (pathname.includes('/discover')) {
      context.page_type = 'recipe_discovery';
    }

    return context;
  }

  /**
   * Generate quick action prompts
   */
  static getQuickActionPrompts() {
    return {
      find_recipe: "I'm looking for a recipe. Can you help me find something to cook?",
      plan_meals: "I need help planning my meals for the week. Can you assist me?",
      shopping_list: "Can you help me create a shopping list based on my meal plans?",
      cooking_tips: "I could use some cooking tips and techniques. What advice do you have?",
      ingredient_substitute: "I need to substitute an ingredient in my recipe. Can you help?",
      dietary_help: "I have specific dietary requirements. Can you suggest suitable recipes?",
      meal_prep: "I want to do meal prep for the week. How should I plan it?",
      quick_meals: "I need ideas for quick and easy meals. What do you recommend?"
    };
  }

  /**
   * Format error messages for display
   */
  static formatErrorMessage(error) {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'Something went wrong. Please try again.';
  }
}

export default AIAssistantService;