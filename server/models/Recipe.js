const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recipeSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Recipe name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  cookingTime: { // e.g., "30 minutes", "1 hour"
    type: String,
    required: [true, 'Cooking time is required'],
  },
  servings: {
    type: Number,
    required: [true, 'Number of servings is required'],
    min: [1, 'Servings must be at least 1'],
  },
  instructions: { // For rich text, this might store HTML or Markdown
    type: String,
    required: [true, 'Instructions are required'],
  },
  image: { // URL to the recipe image
    type: String,
    // Later, this could be an object storing more image details if using cloud storage
  },
  category: { // e.g., breakfast, lunch, dinner, dessert
    type: String,
    trim: true,
  },
  tags: { // e.g., vegetarian, gluten-free, quick
    type: [String],
    default: [],
  },
  user: { // The user who created this recipe
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ingredients: [{
    name: { 
      type: String, 
      required: [true, 'Ingredient name is required'], 
      trim: true 
    },
    quantity: { 
      type: String, // Using String to allow "1/2", "a pinch", "to taste" etc.
      default: '1' 
    },
    unit: { 
      type: String, 
      trim: true,
      default: '' // e.g., "cup", "grams", "tbsp", or empty if not applicable
    }
  }],
  isPublic: {
    type: Boolean,
    default: false,
    index: true, // For efficient querying of public recipes
  },
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Add text index for searching
recipeSchema.index({ 
    name: 'text', 
    description: 'text', 
    category: 'text',
    tags: 'text'
    // Consider adding 'ingredients.name': 'text' if searching by ingredients is desired later
});

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;
