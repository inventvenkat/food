const { docClient } = require('../config/db');
const { PutCommand, QueryCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || 'RecipeAppUsers'; // Use environment variable or default

// Note: Input validation (e.g., for email format, password length) should be done
// in the route handlers (e.g., in auth.js) before calling these functions.

async function createUser({ username, email, password }) {
  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  const timestamp = new Date().toISOString();

  const userItem = {
    PK: `USER#${userId}`,
    SK: `METADATA#${userId}`,
    userId,
    username,
    email,
    passwordHash: hashedPassword,
    createdAt: timestamp,
    updatedAt: timestamp,
    // For GSI lookups by email and username
    GSI1PK: `EMAIL#${email}`,
    GSI1SK: `USER#${userId}`, // Allows fetching user data directly from GSI if needed, or just for existence check
    GSI2PK: `USERNAME#${username}`,
    GSI2SK: `USER#${userId}`,
  };

  const params = {
    TableName: USERS_TABLE_NAME,
    Item: userItem,
    // ConditionExpression to ensure PK doesn't already exist (good practice, though UUIDs are highly unique)
    ConditionExpression: "attribute_not_exists(PK)"
  };

  // For true uniqueness enforcement on email/username, you'd typically:
  // 1. Attempt to write a separate item like `UNIQUE#EMAIL#<email>` with a ConditionExpression.
  // 2. Or, query GSI1PK/GSI2PK first before attempting to create the user.
  // For simplicity here, we assume the calling code (e.g., auth route) will check for existing email/username.

  try {
    await docClient.send(new PutCommand(params));
    // Return a user object without the passwordHash and PK/SK details for API responses
    const { passwordHash, PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...userForResponse } = userItem;
    return userForResponse;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // This specific error for PK collision is unlikely with UUIDs but good to be aware of
      throw new Error('User ID collision, please try again.');
    }
    console.error("Error creating user:", error);
    throw new Error('Could not create user.');
  }
}

async function findUserByEmail(email) {
  const params = {
    TableName: USERS_TABLE_NAME,
    IndexName: 'GSI1PK-GSI1SK-index', // Assuming GSI name: GSI1PK-GSI1SK-index (PK: GSI1PK, SK: GSI1SK)
    KeyConditionExpression: "GSI1PK = :gsi1pk",
    ExpressionAttributeValues: {
      ":gsi1pk": `EMAIL#${email}`,
    },
  };

  try {
    const { Items } = await docClient.send(new QueryCommand(params));
    if (Items && Items.length > 0) {
      // Items[0] contains all attributes, including PK, SK, passwordHash etc.
      // We might want to fetch the primary item if GSI doesn't project all attributes
      // or if we need to ensure we get the most up-to-date main item.
      // For now, returning the item from GSI.
      return Items[0];
    }
    return null;
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw new Error('Could not find user by email.');
  }
}

async function findUserByUsername(username) {
  const params = {
    TableName: USERS_TABLE_NAME,
    IndexName: 'GSI2PK-GSI2SK-index', // Assuming GSI name: GSI2PK-GSI2SK-index (PK: GSI2PK, SK: GSI2SK)
    KeyConditionExpression: "GSI2PK = :gsi2pk",
    ExpressionAttributeValues: {
      ":gsi2pk": `USERNAME#${username}`,
    },
  };

  try {
    const { Items } = await docClient.send(new QueryCommand(params));
     if (Items && Items.length > 0) {
      return Items[0];
    }
    return null;
  } catch (error) {
    console.error("Error finding user by username:", error);
    throw new Error('Could not find user by username.');
  }
}

async function findUserById(userId) {
  const params = {
    TableName: USERS_TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `METADATA#${userId}`,
    },
  };

  try {
    const { Item } = await docClient.send(new GetCommand(params));
    return Item || null;
  } catch (error) {
    console.error("Error finding user by ID:", error);
    throw new Error('Could not find user by ID.');
  }
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  USERS_TABLE_NAME
};
