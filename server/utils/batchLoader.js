const { getDynamoClient } = require('../config/db');

/**
 * Batch loader utility to reduce N+1 query problems in DynamoDB operations
 * Provides efficient batch operations for loading multiple items at once
 */

/**
 * Batch get multiple recipes by their IDs
 * @param {Array<string>} recipeIds - Array of recipe IDs to fetch
 * @returns {Array<Object>} Array of recipe objects (null for not found items)
 */
async function batchGetRecipes(recipeIds) {
  if (!recipeIds || recipeIds.length === 0) {
    return [];
  }

  const client = getDynamoClient();
  const tableName = process.env.RECIPES_TABLE_NAME || 'RecipeAppRecipes';
  console.log('[BatchLoader DEBUG] Using table name:', tableName);
  console.log('[BatchLoader DEBUG] Looking up recipe IDs:', recipeIds);
  
  // DynamoDB batch get has a limit of 100 items per request
  const maxBatchSize = 100;
  const results = [];
  
  for (let i = 0; i < recipeIds.length; i += maxBatchSize) {
    const batch = recipeIds.slice(i, i + maxBatchSize);
    
    // Build the batch get request
    const requestItems = {};
    requestItems[tableName] = {
      Keys: batch.map(recipeId => ({
        PK: { S: `RECIPE#${recipeId}` },
        SK: { S: `METADATA#${recipeId}` }
      }))
    };
    
    console.log('[BatchLoader DEBUG] Batch request keys:', requestItems[tableName].Keys);

    try {
      const command = {
        RequestItems: requestItems
      };

      const response = await client.batchGetItem(command);
      
      console.log('[BatchLoader DEBUG] Response keys:', Object.keys(response));
      console.log('[BatchLoader DEBUG] Response.Responses:', !!response.Responses);
      console.log('[BatchLoader DEBUG] Response.Responses[tableName]:', response.Responses?.[tableName]?.length || 0);
      
      // Process the response and convert DynamoDB format to plain objects
      if (response.Responses && response.Responses[tableName]) {
        const batchResults = response.Responses[tableName].map(item => {
          const converted = convertDynamoItemToPlainObject(item);
          console.log('[BatchLoader DEBUG] Converted item:', { id: converted.id, name: converted.name });
          return converted;
        });
        results.push(...batchResults);
      } else {
        console.log('[BatchLoader DEBUG] No results in response for table:', tableName);
      }

      // Handle unprocessed keys (retry logic could be added here if needed)
      if (response.UnprocessedKeys && Object.keys(response.UnprocessedKeys).length > 0) {
        console.warn('Some items were not processed in batch get operation:', response.UnprocessedKeys);
      }

    } catch (error) {
      console.error('Error in batch get recipes:', error);
      // Return null entries for failed batch
      results.push(...new Array(batch.length).fill(null));
    }
  }

  // Create a map for quick lookup and maintain order
  const recipeMap = new Map();
  results.forEach(recipe => {
    if (recipe) {
      // Use both 'id' and 'recipeId' fields for compatibility
      const recipeKey = recipe.id || recipe.recipeId;
      if (recipeKey) {
        recipeMap.set(recipeKey, recipe);
      }
    }
  });

  // Return results in the same order as requested IDs
  return recipeIds.map(id => recipeMap.get(id) || null);
}

/**
 * Batch get multiple recipe collections by their IDs
 * @param {Array<string>} collectionIds - Array of collection IDs to fetch
 * @returns {Array<Object>} Array of collection objects (null for not found items)
 */
async function batchGetRecipeCollections(collectionIds) {
  if (!collectionIds || collectionIds.length === 0) {
    return [];
  }

  const client = getDynamoClient();
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'recipe-app-all-resources';
  
  const maxBatchSize = 100;
  const results = [];
  
  for (let i = 0; i < collectionIds.length; i += maxBatchSize) {
    const batch = collectionIds.slice(i, i + maxBatchSize);
    
    const requestItems = {};
    requestItems[tableName] = {
      Keys: batch.map(collectionId => ({
        PK: { S: `COLLECTION#${collectionId}` },
        SK: { S: `COLLECTION#${collectionId}` }
      }))
    };

    try {
      const command = {
        RequestItems: requestItems
      };

      const response = await client.batchGetItem(command);
      
      if (response.Responses && response.Responses[tableName]) {
        const batchResults = response.Responses[tableName].map(item => 
          convertDynamoItemToPlainObject(item)
        );
        results.push(...batchResults);
      }

    } catch (error) {
      console.error('Error in batch get recipe collections:', error);
      results.push(...new Array(batch.length).fill(null));
    }
  }

  const collectionMap = new Map();
  results.forEach(collection => {
    if (collection && collection.id) {
      collectionMap.set(collection.id, collection);
    }
  });

  return collectionIds.map(id => collectionMap.get(id) || null);
}

/**
 * Batch write multiple items to DynamoDB
 * @param {Array<Object>} items - Array of items to write
 * @param {string} operation - 'PUT' or 'DELETE'
 * @returns {Object} Result object with successful and failed operations
 */
async function batchWriteItems(items, operation = 'PUT') {
  if (!items || items.length === 0) {
    return { successful: 0, failed: 0, errors: [] };
  }

  const client = getDynamoClient();
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'recipe-app-all-resources';
  
  const maxBatchSize = 25; // DynamoDB batch write limit
  const results = { successful: 0, failed: 0, errors: [] };
  
  for (let i = 0; i < items.length; i += maxBatchSize) {
    const batch = items.slice(i, i + maxBatchSize);
    
    const requestItems = {};
    requestItems[tableName] = batch.map(item => {
      if (operation === 'PUT') {
        return {
          PutRequest: {
            Item: convertPlainObjectToDynamoItem(item)
          }
        };
      } else if (operation === 'DELETE') {
        return {
          DeleteRequest: {
            Key: {
              PK: { S: item.PK },
              SK: { S: item.SK }
            }
          }
        };
      }
    });

    try {
      const command = {
        RequestItems: requestItems
      };

      const response = await client.batchWriteItem(command);
      
      // Count successful operations
      results.successful += batch.length;
      
      // Handle unprocessed items
      if (response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0) {
        const unprocessedCount = response.UnprocessedItems[tableName]?.length || 0;
        results.successful -= unprocessedCount;
        results.failed += unprocessedCount;
        results.errors.push(`${unprocessedCount} items were not processed in batch`);
      }

    } catch (error) {
      console.error('Error in batch write operation:', error);
      results.failed += batch.length;
      results.errors.push(error.message);
    }
  }

  return results;
}

/**
 * Convert DynamoDB item format to plain JavaScript object
 */
function convertDynamoItemToPlainObject(dynamoItem) {
  const item = {};
  
  for (const [key, value] of Object.entries(dynamoItem)) {
    if (value.S !== undefined) {
      item[key] = value.S;
    } else if (value.N !== undefined) {
      item[key] = parseFloat(value.N);
    } else if (value.BOOL !== undefined) {
      item[key] = value.BOOL;
    } else if (value.L !== undefined) {
      item[key] = value.L.map(listItem => convertDynamoItemToPlainObject({ temp: listItem }).temp);
    } else if (value.M !== undefined) {
      item[key] = convertDynamoItemToPlainObject(value.M);
    } else if (value.SS !== undefined) {
      item[key] = value.SS;
    } else if (value.NS !== undefined) {
      item[key] = value.NS.map(n => parseFloat(n));
    } else if (value.NULL !== undefined) {
      item[key] = null;
    }
  }
  
  // Convert back to application format
  if (item.PK && item.PK.startsWith('RECIPE#')) {
    const recipeIdFromPK = item.PK.substring(7);
    item.id = recipeIdFromPK;
    // Ensure both id and recipeId are available for compatibility
    if (!item.recipeId) {
      item.recipeId = recipeIdFromPK;
    }
    item.type = 'recipe';
  } else if (item.PK && item.PK.startsWith('COLLECTION#')) {
    item.id = item.PK.substring(11);
    item.type = 'collection';
  } else if (item.PK && item.PK.startsWith('USER#')) {
    item.id = item.PK.substring(5);
    item.type = 'user';
  }
  
  return item;
}

/**
 * Convert plain JavaScript object to DynamoDB item format
 */
function convertPlainObjectToDynamoItem(obj) {
  const item = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      item[key] = { NULL: true };
    } else if (typeof value === 'string') {
      item[key] = { S: value };
    } else if (typeof value === 'number') {
      item[key] = { N: value.toString() };
    } else if (typeof value === 'boolean') {
      item[key] = { BOOL: value };
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'string') {
        item[key] = { SS: value };
      } else if (value.length > 0 && typeof value[0] === 'number') {
        item[key] = { NS: value.map(n => n.toString()) };
      } else {
        item[key] = { L: value.map(v => convertPlainObjectToDynamoItem({ temp: v }).temp) };
      }
    } else if (typeof value === 'object') {
      item[key] = { M: convertPlainObjectToDynamoItem(value) };
    }
  }
  
  return item;
}

/**
 * Performance monitoring wrapper for batch operations
 */
function withPerformanceLogging(operation, operationName) {
  return async (...args) => {
    const startTime = Date.now();
    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      console.log(`[PERF] ${operationName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[PERF] ${operationName} failed after ${duration}ms:`, error.message);
      throw error;
    }
  };
}

module.exports = {
  batchGetRecipes: withPerformanceLogging(batchGetRecipes, 'batchGetRecipes'),
  batchGetRecipeCollections: withPerformanceLogging(batchGetRecipeCollections, 'batchGetRecipeCollections'),
  batchWriteItems: withPerformanceLogging(batchWriteItems, 'batchWriteItems'),
  convertDynamoItemToPlainObject,
  convertPlainObjectToDynamoItem
};