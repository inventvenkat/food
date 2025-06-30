/**
 * Performance monitoring and logging utilities
 * Provides comprehensive monitoring for database operations and API performance
 */

const EventEmitter = require('events');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.operationCounts = new Map();
    this.slowQueries = [];
    this.startTime = Date.now();
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId, operationType, metadata = {}) {
    const timer = {
      id: operationId,
      type: operationType,
      startTime: Date.now(),
      metadata
    };
    
    this.metrics.set(operationId, timer);
    return timer;
  }

  /**
   * End timing an operation and record metrics
   */
  endTimer(operationId, success = true, errorDetails = null) {
    const timer = this.metrics.get(operationId);
    if (!timer) {
      console.warn(`Timer not found for operation: ${operationId}`);
      return null;
    }

    const duration = Date.now() - timer.startTime;
    const result = {
      ...timer,
      duration,
      success,
      errorDetails,
      endTime: Date.now()
    };

    // Update operation counts
    const countKey = `${timer.type}_${success ? 'success' : 'error'}`;
    this.operationCounts.set(countKey, (this.operationCounts.get(countKey) || 0) + 1);

    // Track slow operations
    const slowThreshold = this.getSlowThreshold(timer.type);
    if (duration > slowThreshold) {
      this.slowQueries.push(result);
      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }
    }

    // Log performance details
    this.logPerformance(result);

    // Emit performance event
    this.emit('operation', result);

    // Clean up
    this.metrics.delete(operationId);

    return result;
  }

  /**
   * Get slow operation threshold based on operation type
   */
  getSlowThreshold(operationType) {
    const thresholds = {
      'dynamodb_query': 500,      // DynamoDB queries
      'dynamodb_scan': 1000,      // DynamoDB scans
      'dynamodb_batch': 800,      // Batch operations
      'api_request': 2000,        // API requests
      'cache_operation': 50,      // Cache operations
      'file_upload': 5000,        // File uploads
      'text_parsing': 3000        // Text parsing operations
    };
    
    return thresholds[operationType] || 1000; // Default 1 second
  }

  /**
   * Log performance metrics
   */
  logPerformance(result) {
    const { id, type, duration, success, metadata } = result;
    const slowThreshold = this.getSlowThreshold(type);
    
    if (duration > slowThreshold) {
      console.warn(`[PERF SLOW] ${type} operation '${id}' took ${duration}ms`, {
        metadata,
        success,
        threshold: slowThreshold
      });
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] ${type} operation '${id}' completed in ${duration}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const totalOperations = Array.from(this.operationCounts.values()).reduce((sum, count) => sum + count, 0);
    
    // Calculate success rates by operation type
    const operationTypes = new Set();
    for (const key of this.operationCounts.keys()) {
      const type = key.replace(/_success$|_error$/, '');
      operationTypes.add(type);
    }

    const operationStats = {};
    for (const type of operationTypes) {
      const successCount = this.operationCounts.get(`${type}_success`) || 0;
      const errorCount = this.operationCounts.get(`${type}_error`) || 0;
      const total = successCount + errorCount;
      
      operationStats[type] = {
        total,
        success: successCount,
        errors: errorCount,
        successRate: total > 0 ? (successCount / total * 100).toFixed(2) + '%' : '0%'
      };
    }

    // Slow query analysis
    const slowQueryStats = this.slowQueries.reduce((stats, query) => {
      const type = query.type;
      if (!stats[type]) {
        stats[type] = { count: 0, avgDuration: 0, maxDuration: 0 };
      }
      stats[type].count++;
      stats[type].avgDuration = (stats[type].avgDuration + query.duration) / 2;
      stats[type].maxDuration = Math.max(stats[type].maxDuration, query.duration);
      return stats;
    }, {});

    return {
      uptime,
      totalOperations,
      operationStats,
      slowQueryStats,
      currentActiveOperations: this.metrics.size,
      recentSlowQueries: this.slowQueries.slice(-10) // Last 10 slow queries
    };
  }

  /**
   * Clear all metrics and reset counters
   */
  reset() {
    this.metrics.clear();
    this.operationCounts.clear();
    this.slowQueries = [];
    this.startTime = Date.now();
  }

  /**
   * Get current active operations
   */
  getActiveOperations() {
    const now = Date.now();
    const activeOps = [];
    
    for (const [id, timer] of this.metrics) {
      activeOps.push({
        id,
        type: timer.type,
        duration: now - timer.startTime,
        metadata: timer.metadata
      });
    }
    
    return activeOps.sort((a, b) => b.duration - a.duration);
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for timing database operations
 */
function withDatabaseTiming(operationType) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args) {
      const operationId = `${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const metadata = { args: args.slice(0, 2) }; // First 2 args only for privacy
      
      performanceMonitor.startTimer(operationId, operationType, metadata);
      
      try {
        const result = await method.apply(this, args);
        performanceMonitor.endTimer(operationId, true);
        return result;
      } catch (error) {
        performanceMonitor.endTimer(operationId, false, error.message);
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Wrapper function for timing async operations
 */
async function withTiming(operationType, operation, metadata = {}) {
  const operationId = `${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  performanceMonitor.startTimer(operationId, operationType, metadata);
  
  try {
    const result = await operation();
    performanceMonitor.endTimer(operationId, true);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(operationId, false, error.message);
    throw error;
  }
}

/**
 * Middleware for timing API requests
 */
function apiTimingMiddleware(req, res, next) {
  const operationId = `api_${req.method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const metadata = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  };
  
  req.performanceTimer = performanceMonitor.startTimer(operationId, 'api_request', metadata);
  
  // Override res.end to capture completion
  const originalEnd = res.end;
  res.end = function(...args) {
    const success = res.statusCode < 400;
    const errorDetails = success ? null : `HTTP ${res.statusCode}`;
    performanceMonitor.endTimer(operationId, success, errorDetails);
    originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Health check endpoint data
 */
function getHealthMetrics() {
  const stats = performanceMonitor.getStats();
  const activeOps = performanceMonitor.getActiveOperations();
  
  // Check for performance issues
  const warnings = [];
  if (activeOps.length > 10) {
    warnings.push('High number of active operations');
  }
  if (stats.slowQueryStats && Object.keys(stats.slowQueryStats).length > 0) {
    warnings.push('Slow queries detected');
  }
  
  // Determine health status
  let status = 'healthy';
  if (warnings.length > 0) status = 'warning';
  if (activeOps.some(op => op.duration > 30000)) status = 'unhealthy'; // 30 second timeout
  
  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: stats.uptime,
    performance: {
      totalOperations: stats.totalOperations,
      activeOperations: activeOps.length,
      operationStats: stats.operationStats,
      slowQueries: Object.keys(stats.slowQueryStats).length
    },
    warnings,
    version: process.env.npm_package_version || '1.0.0'
  };
}

module.exports = {
  performanceMonitor,
  withDatabaseTiming,
  withTiming,
  apiTimingMiddleware,
  getHealthMetrics
};