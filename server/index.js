console.log(`[INIT_DEBUG] process.env.APP_PORT before dotenv: ${process.env.APP_PORT}`);
console.log(`[INIT_DEBUG] process.env.PORT (original) before dotenv: ${process.env.PORT}`);
require('dotenv').config(); // Load environment variables
console.log(`[INIT_DEBUG] process.env.APP_PORT after dotenv: ${process.env.APP_PORT}`);
console.log(`[INIT_DEBUG] process.env.PORT (original) after dotenv: ${process.env.PORT}`);
const express = require('express');
// const mongoose = require('mongoose'); // Mongoose removed for DynamoDB migration
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.APP_PORT || 3001;
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PingCommand } = require('@aws-sdk/client-dynamodb');

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

// MongoDB Connection Logic (Removed for DynamoDB Migration)
// const MONGODB_URI = process.env.MONGODB_URI;

// if (!MONGODB_URI) {
//   console.error('Error: MONGODB_URI is not defined. Please check your .env file.');
//   process.exit(1); // Exit if MongoDB URI is not defined
// }

// mongoose.connect(MONGODB_URI)
//   .then(() => console.log('Successfully connected to MongoDB'))
//   .catch(err => {
//     console.error('MongoDB connection error:', err);
//     process.exit(1); // Exit on connection error
//   });

// TODO: Initialize DynamoDB client here if needed globally, or in specific route/service files.
// For now, assuming DynamoDB client will be initialized and used within route handlers or a data access layer.

const { initializeDatabase } = require('./config/init-dynamodb'); // Import the initializer

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

// Simple health check endpoint (for load balancer)
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Deep health check endpoint (includes DynamoDB connection)
app.get('/health/deep', async (req, res) => {
  try {
    // Check DynamoDB connection using the configured client
    const { dynamodbClient } = require('./config/db');
    await dynamodbClient.send(new PingCommand({}));

    // Add any other health checks here, e.g. check if required env vars are set

    res.status(200).json({ 
      status: 'OK', 
      dynamodb: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Deep health check failed:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize DynamoDB tables before starting the server
initializeDatabase().then(() => {
  console.log(`[DEBUG] process.env.APP_PORT before fallback: ${process.env.APP_PORT}`);
  console.log(`[DEBUG] process.env.PORT (original) before fallback: ${process.env.PORT}`);
  console.log(`[DEBUG] Resolved port variable (from APP_PORT): ${port}`);
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port} (Internal port: ${port}, using APP_PORT: ${process.env.APP_PORT}, original PORT: ${process.env.PORT})`);
  });
}).catch(err => {
  console.error("Failed to initialize database or start server:", err);
  process.exit(1);
});
