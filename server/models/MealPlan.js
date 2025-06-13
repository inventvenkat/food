const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mealPlanSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, // Index for faster queries by user
  },
  date: { // The specific date for the meal
    type: Date,
    required: true,
    index: true, // Index for faster queries by date
  },
  mealType: { // e.g., "Breakfast", "Lunch", "Dinner", "Snack"
    type: String,
    required: true,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], // Define allowed meal types
  },
  recipe: {
    type: Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true,
  },
  plannedServings: { // Number of servings planned for this specific meal instance
    type: Number,
    required: true,
    min: [1, 'Planned servings must be at least 1'],
    default: 1, // Or could default based on recipe's default servings when creating
  },
  // Optional: Add notes for the meal plan entry if needed
  // notes: {
  //   type: String,
  //   trim: true,
  // }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound index to ensure a user doesn't add the same recipe to the same date/mealType slot multiple times
// Or, this logic can be handled at the application level if duplicates are allowed for some reason.
// For now, let's assume one recipe per slot. If multiple, the model might need to change (e.g. recipe array).
// mealPlanSchema.index({ user: 1, date: 1, mealType: 1, recipe: 1 }, { unique: true });
// Decided against unique index for now, as user might want to plan same recipe for lunch and dinner,
// or multiple different recipes for the same slot if the UI supports it later.
// Uniqueness should be managed by application logic if needed for one recipe per slot.

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);

module.exports = MealPlan;
