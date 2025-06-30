const crypto = require('crypto');

/**
 * Simple in-memory cache for AI parsing results
 * In production, consider using Redis or similar external cache
 */
class AICache {
  constructor(maxSize = 1000, ttlMs = 3600000) { // 1 hour TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Generate cache key from recipe text
   */
  generateKey(recipeText) {
    return crypto.createHash('sha256').update(recipeText.trim().toLowerCase()).digest('hex');
  }

  /**
   * Get cached result for recipe text
   */
  get(recipeText) {
    const key = this.generateKey(recipeText);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU eviction
    entry.lastAccessed = Date.now();
    return entry.data;
  }

  /**
   * Store parsed result in cache
   */
  set(recipeText, parsedData) {
    const key = this.generateKey(recipeText);
    const timestamp = Date.now();

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data: parsedData,
      timestamp,
      lastAccessed: timestamp
    });
  }

  /**
   * Evict the oldest (least recently accessed) entry
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear all cached entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs
    };
  }
}

// Export singleton instance
module.exports = new AICache();