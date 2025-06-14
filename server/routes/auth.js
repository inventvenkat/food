const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Import new DynamoDB user functions
const {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById // Though not used in these specific routes, good to be aware of
} = require('../models/User');

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Basic validation (consider adding more comprehensive validation here)
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }
  // TODO: Add more specific validation for email format, username length, password complexity etc.

  try {
    // Check for existing user by email
    let existingUserByEmail = await findUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check for existing user by username
    let existingUserByUsername = await findUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Create new user using the DynamoDB function
    // Password hashing is handled within createUser
    const newUser = await createUser({ username, email, password });

    // Create and sign JWT
    const payload = {
      user: {
        id: newUser.userId, // Use userId from the returned user object
        username: newUser.username
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }, // Token expires in 1 hour
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          token,
          user: { id: newUser.userId, username: newUser.username, email: newUser.email }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    // Generic server error, specific DynamoDB errors might be caught in model functions
    // or could be checked here if needed (e.g., ProvisionedThroughputExceededException)
    res.status(500).send('Server error during registration');
  }
});

// POST /api/auth/login - Authenticate user and get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }
  // TODO: Add email format validation

  try {
    // Check for user using DynamoDB function
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password (user.passwordHash comes from DynamoDB item)
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and sign JWT
    const payload = {
      user: {
        id: user.userId, // Use userId from the DynamoDB item
        username: user.username
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: { id: user.userId, username: user.username, email: user.email }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during login');
  }
});

module.exports = router;
