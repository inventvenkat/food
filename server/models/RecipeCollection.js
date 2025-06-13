const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recipeCollectionSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Collection name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  user: { // Owner of the collection
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recipes: [{ // Array of recipe IDs in this collection
    type: Schema.Types.ObjectId,
    ref: 'Recipe',
  }],
  isPublic: {
    type: Boolean,
    default: false,
    index: true, // For efficient querying of public collections
  },
  // accessType: { // For future use with subscriptions
  //   type: String,
  //   enum: ['private', 'public', 'subscribers_only'],
  //   default: 'private',
  // },
  coverImage: { // URL to a cover image for the collection
    type: String,
    default: '', // Optional
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Optional: Add a text index if you plan to search collections by name/description
// recipeCollectionSchema.index({ name: 'text', description: 'text' });

const RecipeCollection = mongoose.model('RecipeCollection', recipeCollectionSchema);

module.exports = RecipeCollection;
