const { docClient } = require('../config/db');
const { BatchWriteCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

/**
 * Utility for optimized batch operations with DynamoDB
 * Handles chunking, retries, and error management
 */

const BATCH_SIZE = 25; // DynamoDB limit for batch operations
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 100; // Base delay in ms

class BatchOperations {
  /**
   * Batch write operations (create/update/delete)
   */
  static async batchWrite(tableName, writeRequests, options = {}) {
    const { 
      retries = MAX_RETRIES, 
      delayMs = RETRY_DELAY_BASE,
      onProgress = null 
    } = options;
    
    const chunks = this.chunkArray(writeRequests, BATCH_SIZE);
    const results = {
      successful: [],
      failed: [],
      unprocessed: []
    };
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progress = { current: i + 1, total: chunks.length };
      
      if (onProgress) {
        onProgress(progress);
      }
      
      try {
        const batchResult = await this.executeBatchWrite(tableName, chunk, retries, delayMs);
        
        results.successful.push(...batchResult.successful);
        results.failed.push(...batchResult.failed);
        results.unprocessed.push(...batchResult.unprocessed);
        
      } catch (error) {
        console.error(`Batch write chunk ${i + 1} failed:`, error.message);
        results.failed.push(...chunk.map(req => ({
          request: req,
          error: error.message
        })));
      }
      
      // Add delay between chunks to avoid throttling
      if (i < chunks.length - 1) {
        await this.delay(delayMs);
      }
    }
    
    return results;
  }
  
  /**
   * Batch get operations
   */
  static async batchGet(tableName, keys, options = {}) {
    const { 
      retries = MAX_RETRIES,
      delayMs = RETRY_DELAY_BASE,
      consistentRead = false,
      onProgress = null 
    } = options;
    
    const chunks = this.chunkArray(keys, BATCH_SIZE);
    const results = {
      items: [],
      unprocessed: []
    };
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progress = { current: i + 1, total: chunks.length };
      
      if (onProgress) {
        onProgress(progress);
      }
      
      try {
        const batchResult = await this.executeBatchGet(
          tableName, 
          chunk, 
          retries, 
          delayMs,
          consistentRead
        );
        
        results.items.push(...batchResult.items);
        results.unprocessed.push(...batchResult.unprocessed);
        
      } catch (error) {
        console.error(`Batch get chunk ${i + 1} failed:`, error.message);
        results.unprocessed.push(...chunk);
      }
      
      // Add delay between chunks
      if (i < chunks.length - 1) {
        await this.delay(delayMs);
      }
    }
    
    return results;
  }
  
  /**
   * Execute a single batch write with retries
   */
  static async executeBatchWrite(tableName, writeRequests, retries, delayMs) {
    let currentRequests = writeRequests;
    let attempt = 0;
    const results = {
      successful: [],
      failed: [],
      unprocessed: []
    };
    
    while (currentRequests.length > 0 && attempt < retries) {
      attempt++;
      
      try {
        const params = {
          RequestItems: {
            [tableName]: currentRequests
          }
        };
        
        const result = await docClient.send(new BatchWriteCommand(params));
        
        // Calculate successful operations
        const processedCount = currentRequests.length - 
          (result.UnprocessedItems?.[tableName]?.length || 0);
        
        for (let i = 0; i < processedCount; i++) {
          results.successful.push(currentRequests[i]);
        }
        
        // Handle unprocessed items
        if (result.UnprocessedItems?.[tableName]?.length > 0) {
          currentRequests = result.UnprocessedItems[tableName];
          
          if (attempt < retries) {
            // Exponential backoff for retries
            const retryDelay = delayMs * Math.pow(2, attempt - 1);
            console.log(`Retrying ${currentRequests.length} unprocessed items in ${retryDelay}ms`);
            await this.delay(retryDelay);
          } else {
            results.unprocessed.push(...currentRequests);
          }
        } else {
          // All items processed successfully
          break;
        }
        
      } catch (error) {
        if (attempt >= retries) {
          results.failed.push(...currentRequests.map(req => ({
            request: req,
            error: error.message
          })));
          break;
        }
        
        // Exponential backoff for retries
        const retryDelay = delayMs * Math.pow(2, attempt - 1);
        console.log(`Batch write failed, retrying in ${retryDelay}ms:`, error.message);
        await this.delay(retryDelay);
      }
    }
    
    return results;
  }
  
  /**
   * Execute a single batch get with retries
   */
  static async executeBatchGet(tableName, keys, retries, delayMs, consistentRead) {
    let currentKeys = keys;
    let attempt = 0;
    const results = {
      items: [],
      unprocessed: []
    };
    
    while (currentKeys.length > 0 && attempt < retries) {
      attempt++;
      
      try {
        const params = {
          RequestItems: {
            [tableName]: {
              Keys: currentKeys,
              ConsistentRead: consistentRead
            }
          }
        };
        
        const result = await docClient.send(new BatchGetCommand(params));
        
        // Add retrieved items
        if (result.Responses?.[tableName]) {
          results.items.push(...result.Responses[tableName]);
        }
        
        // Handle unprocessed keys
        if (result.UnprocessedKeys?.[tableName]?.Keys?.length > 0) {
          currentKeys = result.UnprocessedKeys[tableName].Keys;
          
          if (attempt < retries) {
            const retryDelay = delayMs * Math.pow(2, attempt - 1);
            console.log(`Retrying ${currentKeys.length} unprocessed keys in ${retryDelay}ms`);
            await this.delay(retryDelay);
          } else {
            results.unprocessed.push(...currentKeys);
          }
        } else {
          break;
        }
        
      } catch (error) {
        if (attempt >= retries) {
          results.unprocessed.push(...currentKeys);
          break;
        }
        
        const retryDelay = delayMs * Math.pow(2, attempt - 1);
        console.log(`Batch get failed, retrying in ${retryDelay}ms:`, error.message);
        await this.delay(retryDelay);
      }
    }
    
    return results;
  }
  
  /**
   * Utility functions
   */
  static chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Create batch write requests for recipe bulk import
   */
  static createRecipeBatchRequests(recipes, tableName) {
    return recipes.map(recipe => ({
      PutRequest: {
        Item: recipe
      }
    }));
  }
  
  /**
   * Create batch get requests for multiple recipes
   */
  static createRecipeBatchKeys(recipeIds) {
    return recipeIds.map(id => ({
      PK: `RECIPE#${id}`,
      SK: `METADATA#${id}`
    }));
  }
  
  /**
   * Optimized bulk recipe import
   */
  static async bulkImportRecipes(recipes, tableName, onProgress = null) {
    console.log(`Starting bulk import of ${recipes.length} recipes`);
    
    const writeRequests = this.createRecipeBatchRequests(recipes, tableName);
    
    const result = await this.batchWrite(tableName, writeRequests, {
      onProgress: onProgress ? (progress) => {
        onProgress({
          ...progress,
          message: `Processing batch ${progress.current} of ${progress.total}`
        });
      } : null
    });
    
    console.log(`Bulk import completed: ${result.successful.length} successful, ${result.failed.length} failed, ${result.unprocessed.length} unprocessed`);
    
    return {
      imported: result.successful.length,
      failed: result.failed.length,
      unprocessed: result.unprocessed.length,
      errors: result.failed.map(f => f.error)
    };
  }
  
  /**
   * Optimized bulk recipe retrieval
   */
  static async bulkGetRecipes(recipeIds, tableName) {
    console.log(`Bulk retrieving ${recipeIds.length} recipes`);
    
    const keys = this.createRecipeBatchKeys(recipeIds);
    
    const result = await this.batchGet(tableName, keys);
    
    // Transform items back to clean recipe objects
    const recipes = result.items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...recipe } = item;
      return recipe;
    });
    
    console.log(`Retrieved ${recipes.length} recipes, ${result.unprocessed.length} not found/failed`);
    
    return {
      recipes,
      notFound: result.unprocessed.map(key => key.PK.replace('RECIPE#', ''))
    };
  }
}

/**
 * Query optimization utilities
 */
class QueryOptimizer {
  /**
   * Build optimized filter expressions for DynamoDB
   */
  static buildFilterExpression(filters) {
    const conditions = [];
    const attributeNames = {};
    const attributeValues = {};
    let nameCounter = 0;
    let valueCounter = 0;
    
    for (const [field, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;
      
      nameCounter++;
      valueCounter++;
      const nameKey = `#attr${nameCounter}`;
      const valueKey = `:val${valueCounter}`;
      
      attributeNames[nameKey] = field;
      
      if (Array.isArray(value)) {
        // IN condition for arrays
        const valueKeys = value.map((v, i) => {
          const vKey = `:val${valueCounter}_${i}`;
          attributeValues[vKey] = v;
          return vKey;
        });
        conditions.push(`${nameKey} IN (${valueKeys.join(', ')})`);
      } else if (typeof value === 'string' && value.includes('*')) {
        // Contains condition for wildcard strings
        const searchValue = value.replace(/\*/g, '');
        attributeValues[valueKey] = searchValue;
        conditions.push(`contains(${nameKey}, ${valueKey})`);
      } else {
        // Exact match
        attributeValues[valueKey] = value;
        conditions.push(`${nameKey} = ${valueKey}`);
      }
    }
    
    return {
      filterExpression: conditions.join(' AND '),
      attributeNames,
      attributeValues
    };
  }
  
  /**
   * Create pagination token for secure continuation
   */
  static createPaginationToken(lastEvaluatedKey) {
    if (!lastEvaluatedKey) return null;
    
    try {
      return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
    } catch (error) {
      console.error('Error creating pagination token:', error);
      return null;
    }
  }
  
  /**
   * Parse pagination token
   */
  static parsePaginationToken(token) {
    if (!token) return null;
    
    try {
      return JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (error) {
      console.error('Error parsing pagination token:', error);
      return null;
    }
  }
}

module.exports = {
  BatchOperations,
  QueryOptimizer
};