require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose'); // Require Mongoose
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// --- Multer Setup for File Uploads ---
const recipeImageDir = path.join(__dirname, 'uploads', 'recipe_images');

// Ensure the upload directory exists
if (!fs.existsSync(recipeImageDir)) {
  fs.mkdirSync(recipeImageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, recipeImageDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });
// Make upload instance available for routes if needed, or apply directly in routes
app.locals.upload = upload; // Example of making it available globally, or pass to routes

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --- End Multer Setup ---

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined. Please check your .env file.');
  process.exit(1); // Exit if MongoDB URI is not defined
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit on connection error
  });

// Routes
const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');
const shoppingListRoutes = require('./routes/shoppingList');
const mealPlanRoutes = require('./routes/mealPlans');
const recipeCollectionRoutes = require('./routes/recipeCollections'); // Import collection routes

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/shopping-list', shoppingListRoutes);
app.use('/api/mealplans', mealPlanRoutes);
app.use('/api/collections', recipeCollectionRoutes); // Mount collection routes

// A simple API endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the Recipe App API!' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
