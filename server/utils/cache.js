/**
 * Simple in-memory cache utility for performance optimization
 * Provides TTL-based caching for frequently accessed data
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set a cache entry with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set(key, value, ttlMs = 300000) { // Default 5 minutes
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      ttl: ttlMs
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlMs);

    this.timers.set(key, timer);
  }

  /**
   * Get a cache entry
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Delete a cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalMemoryUsage: this._calculateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  _calculateMemoryUsage() {
    let totalSize = 0;
    for (const [key, entry] of this.cache) {
      totalSize += key.length * 2; // Rough string size
      totalSize += JSON.stringify(entry.value).length * 2; // Rough object size
    }
    return totalSize;
  }

  /**
   * Get or set pattern - fetch value if not cached
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch value if not cached
   * @param {number} ttlMs - Time to live in milliseconds
   */
  async getOrSet(key, fetchFn, ttlMs = 300000) {
    let value = this.get(key);
    if (value !== null) {
      return value;
    }

    try {
      value = await fetchFn();
      this.set(key, value, ttlMs);
      return value;
    } catch (error) {
      console.error(`Error fetching value for cache key ${key}:`, error);
      throw error;
    }
  }
}

// Global cache instances
const recipeCache = new MemoryCache();
const publicRecipesCache = new MemoryCache();
const collectionsCache = new MemoryCache();
const searchCache = new MemoryCache();

/**
 * Cache wrapper for recipe operations
 */
class RecipeCacheManager {
  /**
   * Get cached recipe or fetch from database
   */
  static async getRecipe(recipeId, fetchFn) {
    const cacheKey = `recipe:${recipeId}`;
    return recipeCache.getOrSet(cacheKey, fetchFn, 300000); // 5 minutes
  }

  /**
   * Get cached public recipes list
   */
  static async getPublicRecipes(limit, lastEvaluatedKey, fetchFn) {
    const cacheKey = `public_recipes:${limit}:${JSON.stringify(lastEvaluatedKey)}`;
    return publicRecipesCache.getOrSet(cacheKey, fetchFn, 180000); // 3 minutes
  }

  /**
   * Get cached recipe collection
   */
  static async getCollection(collectionId, fetchFn) {
    const cacheKey = `collection:${collectionId}`;
    return collectionsCache.getOrSet(cacheKey, fetchFn, 300000); // 5 minutes
  }

  /**
   * Get cached search results
   */
  static async getSearchResults(searchParams, fetchFn) {
    const cacheKey = `search:${JSON.stringify(searchParams)}`;
    return searchCache.getOrSet(cacheKey, fetchFn, 120000); // 2 minutes
  }

  /**
   * Invalidate recipe cache when recipe is updated
   */
  static invalidateRecipe(recipeId) {
    recipeCache.delete(`recipe:${recipeId}`);
    // Also clear public recipes cache as it might include this recipe
    publicRecipesCache.clear();
    // Clear search cache as it might include this recipe
    searchCache.clear();
  }

  /**
   * Invalidate collection cache when collection is updated
   */
  static invalidateCollection(collectionId) {
    collectionsCache.delete(`collection:${collectionId}`);
    // Also clear public recipes cache if it's a public collection
    publicRecipesCache.clear();
  }

  /**
   * Clear all recipe-related caches
   */
  static clearAll() {
    recipeCache.clear();
    publicRecipesCache.clear();
    collectionsCache.clear();
    searchCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    return {
      recipeCache: recipeCache.getStats(),
      publicRecipesCache: publicRecipesCache.getStats(),
      collectionsCache: collectionsCache.getStats(),
      searchCache: searchCache.getStats()
    };
  }
}

/**
 * Middleware to add cache headers for static content
 */
function addCacheHeaders(maxAge = 300) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
}

/**
 * Performance monitoring wrapper for cached operations
 */
function withCacheLogging(operation, operationName) {
  return async (...args) => {
    const startTime = Date.now();
    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      
      // Log cache hit/miss
      const cacheHit = duration < 10; // Assume cache hit if very fast
      console.log(`[CACHE] ${operationName} ${cacheHit ? 'HIT' : 'MISS'} in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[CACHE] ${operationName} ERROR after ${duration}ms:`, error.message);
      throw error;
    }
  };
}

module.exports = {
  MemoryCache,
  RecipeCacheManager,
  addCacheHeaders,
  withCacheLogging,
  // Direct cache access for advanced usage
  recipeCache,
  publicRecipesCache,
  collectionsCache,
  searchCache
};