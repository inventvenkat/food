const { docClient } = require('../config/db');
const {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand // Added for simple public recipe listing initially
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');
const { RecipeCacheManager } = require('../utils/cache');

const RECIPES_TABLE_NAME = process.env.RECIPES_TABLE_NAME || 'RecipeAppRecipes';

// Note: Mongoose text indexing is not directly available in DynamoDB.
// For advanced search, consider services like Amazon OpenSearch Service.
// Basic filtering can be done with FilterExpressions but can be inefficient on large datasets.

// --- Helper function to create GSI attributes ---
// This is a simplified example. You might want more sophisticated GSI key generation.
const createGsiPkSk = (recipe) => {
  const gsiAttrs = {};
  if (recipe.authorId) {
    // recipe.authorId is already in USER#<id> format when passed from createRecipe
    gsiAttrs.GSI1PK = recipe.authorId;
    gsiAttrs.GSI1SK = `RECIPE#${recipe.createdAt}`; // Sort user's recipes by creation time
  }
  if (recipe.isPublic !== undefined) {
    // For querying public recipes, sorted by creation time
    gsiAttrs.GSI2PK = `PUBLIC#${String(recipe.isPublic).toUpperCase()}`;
    gsiAttrs.GSI2SK = `CREATEDAT#${recipe.createdAt}`;
  }
  if (recipe.category) {
    // For querying recipes by category, sorted by creation time
    gsiAttrs.GSI3PK = `CATEGORY#${recipe.category.toUpperCase()}`;
    gsiAttrs.GSI3SK = `RECIPE#${recipe.createdAt}`;
  }
  return gsiAttrs;
};


async function createRecipe({ recipeData, authorId, authorUsername }) {
  const recipeId = uuidv4();
  const timestamp = new Date().toISOString();

  const item = {
    PK: `RECIPE#${recipeId}`,
    SK: `METADATA#${recipeId}`,
    recipeId,
    authorId, // This should be the full USER#<userId>
    authorUsername, // Denormalized for easier display
    ...recipeData, // Spread other fields like name, description, ingredients, etc.
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Add GSI attributes
  const gsiAttributes = createGsiPkSk(item);
  const finalItem = { ...item, ...gsiAttributes };

  const params = {
    TableName: RECIPES_TABLE_NAME,
    Item: finalItem,
    ConditionExpression: "attribute_not_exists(PK)"
  };

  try {
    await docClient.send(new PutCommand(params));
    // Return a clean recipe object for API response
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...recipeForResponse } = finalItem;
    return recipeForResponse;
  } catch (error) {
    console.error("Error creating recipe:", error);
    throw new Error('Could not create recipe.');
  }
}

async function getRecipeById(recipeId) {
  console.log('[Recipe Model] Getting recipe by ID:', recipeId);
  return RecipeCacheManager.getRecipe(recipeId, async () => {
    console.log('[Recipe Model] Cache miss, fetching from DB for ID:', recipeId);
    const params = {
      TableName: RECIPES_TABLE_NAME,
      Key: {
        PK: `RECIPE#${recipeId}`,
        SK: `METADATA#${recipeId}`,
      },
    };

    try {
      const { Item } = await docClient.send(new GetCommand(params));
      if (Item) {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...recipe } = Item;
        console.log('[Recipe Model] Found recipe:', { 
          id: recipe.recipeId, 
          name: recipe.name, 
          isPublic: recipe.isPublic,
          authorId: recipe.authorId,
          ingredientsCount: recipe.ingredients?.length || 0
        });
        // Map recipeId to _id for frontend compatibility (MongoDB format)
        return { ...recipe, _id: recipe.recipeId };
      } else {
        console.log('[Recipe Model] Recipe not found in DB for ID:', recipeId);
        return null;
      }
    } catch (error) {
      console.error("Error getting recipe by ID:", error);
      throw new Error('Could not retrieve recipe.');
    }
  });
}

async function getRecipesByAuthor(authorId, limit = 10, lastEvaluatedKey = null) {
  const params = {
    TableName: RECIPES_TABLE_NAME,
    IndexName: 'GSI1PK-GSI1SK-index', // Assumes GSI name: GSI1PK-GSI1SK-index
    KeyConditionExpression: "GSI1PK = :authorId",
    ExpressionAttributeValues: {
      ":authorId": `USER#${authorId}`,
    },
    ScanIndexForward: false, // Sort by SK (createdAt) in descending order (newest first)
    Limit: limit,
  };
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }

  try {
    const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));
    const recipes = Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...recipe } = item;
      // Map recipeId to _id for frontend compatibility (MongoDB format)
      return { ...recipe, _id: recipe.recipeId };
    });
    return { recipes, lastEvaluatedKey: LastEvaluatedKey };
  } catch (error) {
    console.error("Error getting recipes by author:", error);
    throw new Error('Could not retrieve recipes by author.');
  }
}

// Simplified initial version for public recipes.
// A Scan is generally not recommended for large tables in production without careful consideration.
// Using GSI2 (PUBLIC#TRUE / CREATEDAT#<timestamp>) would be more performant.
async function getPublicRecipes(limit = 10, lastEvaluatedKey = null) {
  return RecipeCacheManager.getPublicRecipes(limit, lastEvaluatedKey, async () => {
    const params = {
      TableName: RECIPES_TABLE_NAME,
      IndexName: 'GSI2PK-GSI2SK-index',
      KeyConditionExpression: "GSI2PK = :gsi2pk",
      ExpressionAttributeValues: {
        ":gsi2pk": `PUBLIC#TRUE`,
      },
      ScanIndexForward: false, // Newest first based on GSI2SK (createdAt)
      Limit: limit,
    };
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    try {
      const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));
      const recipes = Items.map(item => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...recipe } = item;
        // Map recipeId to _id for frontend compatibility (MongoDB format)
        return { ...recipe, _id: recipe.recipeId };
      });
      return { recipes, lastEvaluatedKey: LastEvaluatedKey };
    } catch (error) {
      console.error("Error getting public recipes:", error);
      throw new Error('Could not retrieve public recipes.');
    }
  });
}

// Search public recipes with text query
async function searchPublicRecipes(searchTerm, limit = 20, lastEvaluatedKey = null) {
  if (!searchTerm || !searchTerm.trim()) {
    return getPublicRecipes(limit, lastEvaluatedKey);
  }

  const params = {
    TableName: RECIPES_TABLE_NAME,
    IndexName: 'GSI2PK-GSI2SK-index',
    KeyConditionExpression: "GSI2PK = :gsi2pk",
    FilterExpression: "contains(#name, :searchTerm) OR contains(description, :searchTerm) OR contains(category, :searchTerm) OR contains(authorUsername, :searchTerm) OR contains(tags, :searchTerm)",
    ExpressionAttributeNames: {
      "#name": "name", // 'name' might be a reserved word in DynamoDB
    },
    ExpressionAttributeValues: {
      ":gsi2pk": `PUBLIC#TRUE`,
      ":searchTerm": searchTerm.toLowerCase(),
    },
    ScanIndexForward: false, // Newest first
    Limit: limit,
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }

  try {
    const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));
    const recipes = Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...recipe } = item;
      // Map recipeId to _id for frontend compatibility (MongoDB format)
      return { ...recipe, _id: recipe.recipeId };
    });
    return { recipes, lastEvaluatedKey: LastEvaluatedKey };
  } catch (error) {
    console.error("Error searching public recipes:", error);
    throw new Error('Could not search public recipes.');
  }
}


async function updateRecipe(recipeId, authorId, updateData) {
  const timestamp = new Date().toISOString();
  let updateExpression = 'set ';
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Build UpdateExpression, ExpressionAttributeNames, and ExpressionAttributeValues
  // Exclude primary key attributes (PK, SK, recipeId, authorId) from direct update here
  // authorId is used in ConditionExpression
  let nameCounter = 0;
  for (const key in updateData) {
    if (updateData.hasOwnProperty(key) && !['recipeId', 'authorId', 'PK', 'SK', 'createdAt'].includes(key)) {
      nameCounter++;
      const namePlaceholder = `#attr${nameCounter}`;
      const valuePlaceholder = `:val${nameCounter}`;
      updateExpression += `${namePlaceholder} = ${valuePlaceholder}, `;
      expressionAttributeNames[namePlaceholder] = key;
      expressionAttributeValues[valuePlaceholder] = updateData[key];
    }
  }

  // Add updatedAt timestamp
  updateExpression += '#updatedAt = :updatedAt';
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = timestamp;

  // Update GSI fields if relevant attributes changed (e.g., category, isPublic)
  // This part can get complex and might need specific handling based on what changed.
  // For simplicity, this example doesn't rebuild all GSI keys on every update,
  // but in a real app, if 'category' or 'isPublic' changes, their GSI PK/SK might need updating.
  // This often involves deleting the old GSI item and putting a new one, or complex updates.
  // A simpler approach for now is to ensure GSI keys are updated if their source attributes change.
  if (updateData.category) {
    expressionAttributeNames['#gsi3pk'] = 'GSI3PK';
    expressionAttributeValues[':gsi3pk_val'] = `CATEGORY#${updateData.category.toUpperCase()}`;
    updateExpression += ', #gsi3pk = :gsi3pk_val';
  }
  if (updateData.isPublic !== undefined) {
    expressionAttributeNames['#gsi2pk'] = 'GSI2PK';
    expressionAttributeValues[':gsi2pk_val'] = `PUBLIC#${String(updateData.isPublic).toUpperCase()}`;
    updateExpression += ', #gsi2pk = :gsi2pk_val';
  }


  if (Object.keys(expressionAttributeNames).length === 1 && expressionAttributeNames['#updatedAt']) { // Only updatedAt
    console.warn("UpdateRecipe called with no updatable fields other than timestamp.");
    // Still proceed to update timestamp
  }
  if (updateExpression === 'set ') { // No valid fields to update
      throw new Error("No valid fields provided for update.");
  }


  const params = {
    TableName: RECIPES_TABLE_NAME,
    Key: {
      PK: `RECIPE#${recipeId}`,
      SK: `METADATA#${recipeId}`,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: "authorId = :authorId", // Ensure only the author can update
    ReturnValues: "ALL_NEW", // Get all attributes of the updated item
  };
  expressionAttributeValues[':authorId'] = authorId;


  try {
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...recipe } = Attributes;
    
    // Invalidate cache for the updated recipe
    RecipeCacheManager.invalidateRecipe(recipeId);
    
    return recipe;
  } catch (error) {
    console.error("Error updating recipe:", error);
    if (error.name === 'ConditionalCheckFailedException') {
      throw new Error('Update failed: You might not be the author or the recipe does not exist.');
    }
    throw new Error('Could not update recipe.');
  }
}

async function deleteRecipe(recipeId, authorId) {
  const params = {
    TableName: RECIPES_TABLE_NAME,
    Key: {
      PK: `RECIPE#${recipeId}`,
      SK: `METADATA#${recipeId}`,
    },
    ConditionExpression: "authorId = :authorId", // Ensure only the author can delete
    ExpressionAttributeValues: {
      ":authorId": authorId,
    },
  };

  try {
    await docClient.send(new DeleteCommand(params));
    
    // Invalidate cache for the deleted recipe
    RecipeCacheManager.invalidateRecipe(recipeId);
    
    return { message: 'Recipe deleted successfully' };
  } catch (error) {
    console.error("Error deleting recipe:", error);
    if (error.name === 'ConditionalCheckFailedException') {
      throw new Error('Delete failed: You might not be the author or the recipe does not exist.');
    }
    throw new Error('Could not delete recipe.');
  }
}


module.exports = {
  createRecipe,
  getRecipeById,
  getRecipesByAuthor,
  getPublicRecipes,
  searchPublicRecipes,
  updateRecipe,
  deleteRecipe,
  RECIPES_TABLE_NAME
};
