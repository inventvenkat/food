const { docClient } = require('../config/db');
const {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');

const RECIPE_COLLECTIONS_TABLE_NAME = process.env.RECIPE_COLLECTIONS_TABLE_NAME || 'RecipeAppCollections';

// Helper to create GSI attributes for collections
const createCollectionGsiPkSk = (collection) => {
  const gsiAttrs = {};
  if (collection.authorId) {
    gsiAttrs.GSI1PK = `USER#${collection.authorId}`; // For user's collections
    gsiAttrs.GSI1SK = `COLLECTION#${collection.createdAt}`;
  }
  if (collection.isPublic !== undefined) {
    gsiAttrs.GSI2PK = `PUBLIC#${String(collection.isPublic).toUpperCase()}`; // For public collections
    gsiAttrs.GSI2SK = `COLLECTION#${collection.createdAt}`;
  }
  return gsiAttrs;
};

// Updated signature to include 'recipes'
async function createRecipeCollection({ name, description, recipes: inputRecipes, authorId, authorUsername, isPublic = false, coverImage = '' }) {
  const collectionId = uuidv4();
  const timestamp = new Date().toISOString();

  const item = {
    PK: `COLLECTION#${collectionId}`,
    SK: `METADATA#${collectionId}`,
    collectionId,
    name,
    description: description || '',
    authorId, // e.g., USER#<uuid>
    authorUsername, // Denormalized
    recipes: inputRecipes || [], // Use the passed recipes array
    isPublic,
    coverImage,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const gsiAttributes = createCollectionGsiPkSk(item);
  const finalItem = { ...item, ...gsiAttributes };

  const params = {
    TableName: RECIPE_COLLECTIONS_TABLE_NAME,
    Item: finalItem,
    ConditionExpression: "attribute_not_exists(PK)"
  };

  try {
    await docClient.send(new PutCommand(params));
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...collectionForResponse } = finalItem;
    return collectionForResponse;
  } catch (error) {
    console.error("Error creating recipe collection:", error);
    throw new Error('Could not create recipe collection.');
  }
}

async function getRecipeCollectionById(collectionId) {
  const params = {
    TableName: RECIPE_COLLECTIONS_TABLE_NAME,
    Key: {
      PK: `COLLECTION#${collectionId}`,
      SK: `METADATA#${collectionId}`,
    },
  };
  try {
    const { Item } = await docClient.send(new GetCommand(params));
    if (Item) {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...collection } = Item;
      // Map collectionId to _id for frontend compatibility (MongoDB format)
      return { ...collection, _id: collection.collectionId };
    }
    return null;
  } catch (error) {
    console.error("Error getting recipe collection by ID:", error);
    throw new Error('Could not retrieve recipe collection.');
  }
}

async function getRecipeCollectionsByAuthor(authorId, limit = 10, lastEvaluatedKey = null) {
  console.log(`[DEBUG] getRecipeCollectionsByAuthor - received authorId: ${authorId}`);
  const params = {
    TableName: RECIPE_COLLECTIONS_TABLE_NAME,
    IndexName: 'GSI1PK-GSI1SK-index', // Assumes GSI for user's collections
    KeyConditionExpression: "GSI1PK = :authorId",
    ExpressionAttributeValues: {
      ":authorId": `USER#${authorId}`,
    },
    ScanIndexForward: false, // Newest first
    Limit: limit,
  };
  if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
  console.log(`[DEBUG] getRecipeCollectionsByAuthor - DynamoDB Query params: ${JSON.stringify(params, null, 2)}`);

  try {
    const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));
    console.log(`[DEBUG] getRecipeCollectionsByAuthor - Raw Items from DynamoDB: ${JSON.stringify(Items, null, 2)}`);
    const collections = Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...collection } = item;
      // Map collectionId to _id for frontend compatibility (MongoDB format)
      return { ...collection, _id: collection.collectionId };
    });
    return { collections, lastEvaluatedKey: LastEvaluatedKey };
  } catch (error) {
    console.error("Error getting recipe collections by author:", error);
    throw new Error('Could not retrieve recipe collections by author.');
  }
}

async function getPublicRecipeCollections(limit = 10, lastEvaluatedKey = null) {
  const params = {
    TableName: RECIPE_COLLECTIONS_TABLE_NAME,
    IndexName: 'GSI2PK-GSI2SK-index', // Assumes GSI for public collections
    KeyConditionExpression: "GSI2PK = :isPublic",
    ExpressionAttributeValues: {
      ":isPublic": `PUBLIC#TRUE`,
    },
    ScanIndexForward: false, // Newest first
    Limit: limit,
  };
  if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;

  try {
    const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));
    const collections = Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...collection } = item;
      // Map collectionId to _id for frontend compatibility (MongoDB format)
      return { ...collection, _id: collection.collectionId };
    });
    return { collections, lastEvaluatedKey: LastEvaluatedKey };
  } catch (error) {
    console.error("Error getting public recipe collections:", error);
    throw new Error('Could not retrieve public recipe collections.');
  }
}

// Search public collections with text query
async function searchPublicCollections(searchTerm, limit = 20, lastEvaluatedKey = null) {
  if (!searchTerm || !searchTerm.trim()) {
    return getPublicRecipeCollections(limit, lastEvaluatedKey);
  }

  const params = {
    TableName: RECIPE_COLLECTIONS_TABLE_NAME,
    IndexName: 'GSI2PK-GSI2SK-index',
    KeyConditionExpression: "GSI2PK = :isPublic",
    FilterExpression: "contains(#name, :searchTerm) OR contains(description, :searchTerm) OR contains(authorUsername, :searchTerm)",
    ExpressionAttributeNames: {
      "#name": "name", // 'name' might be a reserved word in DynamoDB
    },
    ExpressionAttributeValues: {
      ":isPublic": `PUBLIC#TRUE`,
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
    const collections = Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...collection } = item;
      // Map collectionId to _id for frontend compatibility (MongoDB format)
      return { ...collection, _id: collection.collectionId };
    });
    return { collections, lastEvaluatedKey: LastEvaluatedKey };
  } catch (error) {
    console.error("Error searching public collections:", error);
    throw new Error('Could not search public collections.');
  }
}

async function updateRecipeCollection(collectionId, authorId, updateData) {
  const timestamp = new Date().toISOString();
  let updateExpression = 'set ';
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  let nameCounter = 0;

  for (const key in updateData) {
    if (updateData.hasOwnProperty(key) && !['collectionId', 'authorId', 'PK', 'SK', 'createdAt', 'recipes'].includes(key)) {
      nameCounter++;
      const namePlaceholder = `#attr${nameCounter}`;
      const valuePlaceholder = `:val${nameCounter}`;
      updateExpression += `${namePlaceholder} = ${valuePlaceholder}, `;
      expressionAttributeNames[namePlaceholder] = key;
      expressionAttributeValues[valuePlaceholder] = updateData[key];
    }
  }
  updateExpression += '#updatedAt = :updatedAt';
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = timestamp;

  // Handle GSI updates if isPublic or other GSI key attributes change
  if (updateData.isPublic !== undefined) {
    expressionAttributeNames['#gsi2pk'] = 'GSI2PK';
    expressionAttributeValues[':gsi2pk_val'] = `PUBLIC#${String(updateData.isPublic).toUpperCase()}`;
    updateExpression += ', #gsi2pk = :gsi2pk_val';
  }
  // Note: If 'recipes' array is part of updateData, it's handled by specific functions below or needs careful UpdateExpression.
  // This generic update function does not handle list modifications for 'recipes' array directly.

  if (Object.keys(expressionAttributeNames).length === 1 && expressionAttributeNames['#updatedAt']) {
     // Only updatedAt, still proceed
  } else if (updateExpression === 'set ') {
      throw new Error("No valid fields provided for update.");
  }

  const params = {
    TableName: RECIPE_COLLECTIONS_TABLE_NAME,
    Key: { PK: `COLLECTION#${collectionId}`, SK: `METADATA#${collectionId}` },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: { ...expressionAttributeValues, ":authorId": authorId },
    ConditionExpression: "authorId = :authorId",
    ReturnValues: "ALL_NEW",
  };

  try {
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...collection } = Attributes;
    return collection;
  } catch (error) {
    console.error("Error updating recipe collection:", error);
    if (error.name === 'ConditionalCheckFailedException') {
      throw new Error('Update failed: You might not be the author or collection does not exist.');
    }
    throw new Error('Could not update recipe collection.');
  }
}

async function addRecipeToCollection(collectionId, recipeId, authorId) {
  const params = {
    TableName: RECIPE_COLLECTIONS_TABLE_NAME,
    Key: { PK: `COLLECTION#${collectionId}`, SK: `METADATA#${collectionId}` },
    UpdateExpression: "ADD recipes :recipeIdSet SET updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":recipeIdSet": docClient.createSet([`RECIPE#${recipeId}`]), // Add to a SET to ensure uniqueness
      ":authorId": authorId,
      ":updatedAt": new Date().toISOString()
    },
    ConditionExpression: "authorId = :authorId AND attribute_exists(PK)", // Ensure user owns it and it exists
    ReturnValues: "UPDATED_NEW"
  };
  try {
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    return Attributes;
  } catch (error) {
    console.error("Error adding recipe to collection:", error);
    throw new Error("Could not add recipe to collection.");
  }
}

async function removeRecipeFromCollection(collectionId, recipeId, authorId) {
  const params = {
    TableName: RECIPE_COLLECTIONS_TABLE_NAME,
    Key: { PK: `COLLECTION#${collectionId}`, SK: `METADATA#${collectionId}` },
    UpdateExpression: "DELETE recipes :recipeIdSet SET updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":recipeIdSet": docClient.createSet([`RECIPE#${recipeId}`]), // Remove from a SET
      ":authorId": authorId,
      ":updatedAt": new Date().toISOString()
    },
    ConditionExpression: "authorId = :authorId AND attribute_exists(PK)",
    ReturnValues: "UPDATED_NEW"
  };
  try {
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    return Attributes;
  } catch (error) {
    console.error("Error removing recipe from collection:", error);
    throw new Error("Could not remove recipe from collection.");
  }
}

async function deleteRecipeCollection(collectionId, authorId) {
  const params = {
    TableName: RECIPE_COLLECTIONS_TABLE_NAME,
    Key: { PK: `COLLECTION#${collectionId}`, SK: `METADATA#${collectionId}` },
    ConditionExpression: "authorId = :authorId",
    ExpressionAttributeValues: { ":authorId": authorId },
  };
  try {
    await docClient.send(new DeleteCommand(params));
    return { message: 'Recipe collection deleted successfully' };
  } catch (error) {
    console.error("Error deleting recipe collection:", error);
    if (error.name === 'ConditionalCheckFailedException') {
      throw new Error('Delete failed: You might not be the author or collection does not exist.');
    }
    throw new Error('Could not delete recipe collection.');
  }
}

module.exports = {
  createRecipeCollection,
  getRecipeCollectionById,
  getRecipeCollectionsByAuthor,
  getPublicRecipeCollections,
  searchPublicCollections,
  updateRecipeCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
  deleteRecipeCollection,
  RECIPE_COLLECTIONS_TABLE_NAME
};
