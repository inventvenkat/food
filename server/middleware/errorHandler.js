/**
 * Enhanced error handling middleware for better error reporting and monitoring
 * Provides structured error responses and performance logging
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Standard error response format
 */
function createErrorResponse(message, details = null, errorId = null) {
  return {
    success: false,
    message,
    details,
    errorId,
    timestamp: new Date().toISOString()
  };
}

/**
 * DynamoDB specific error handler
 */
function handleDynamoDBError(error) {
  const errorId = uuidv4();
  console.error(`[ERROR ${errorId}] DynamoDB Error:`, {
    name: error.name,
    message: error.message,
    code: error.$metadata?.httpStatusCode,
    requestId: error.$metadata?.requestId,
    stack: error.stack
  });

  switch (error.name) {
    case 'ConditionalCheckFailedException':
      return {
        status: 409,
        response: createErrorResponse(
          'Operation failed due to condition check',
          'The item may not exist or you may not have permission to modify it',
          errorId
        )
      };
    
    case 'ValidationException':
      return {
        status: 400,
        response: createErrorResponse(
          'Invalid request parameters',
          error.message,
          errorId
        )
      };
    
    case 'ResourceNotFoundException':
      return {
        status: 404,
        response: createErrorResponse(
          'Resource not found',
          'The requested item or table does not exist',
          errorId
        )
      };
    
    case 'ProvisionedThroughputExceededException':
    case 'ThrottlingException':
      return {
        status: 429,
        response: createErrorResponse(
          'Rate limit exceeded',
          'Please reduce request frequency and try again',
          errorId
        )
      };
    
    case 'ServiceUnavailableException':
    case 'InternalServerError':
      return {
        status: 503,
        response: createErrorResponse(
          'Service temporarily unavailable',
          'Please try again in a few moments',
          errorId
        )
      };
    
    default:
      return {
        status: 500,
        response: createErrorResponse(
          'Database operation failed',
          'An unexpected database error occurred',
          errorId
        )
      };
  }
}

/**
 * Authentication and authorization error handler
 */
function handleAuthError(error) {
  const errorId = uuidv4();
  console.error(`[ERROR ${errorId}] Auth Error:`, error.message);

  if (error.message.includes('token') || error.message.includes('unauthorized')) {
    return {
      status: 401,
      response: createErrorResponse(
        'Authentication required',
        'Please provide a valid authentication token',
        errorId
      )
    };
  }

  if (error.message.includes('permission') || error.message.includes('forbidden')) {
    return {
      status: 403,
      response: createErrorResponse(
        'Insufficient permissions',
        'You do not have permission to access this resource',
        errorId
      )
    };
  }

  return {
    status: 401,
    response: createErrorResponse(
      'Authentication failed',
      error.message,
      errorId
    )
  };
}

/**
 * Validation error handler
 */
function handleValidationError(error) {
  const errorId = uuidv4();
  console.error(`[ERROR ${errorId}] Validation Error:`, error.message);

  return {
    status: 400,
    response: createErrorResponse(
      'Invalid input data',
      error.message,
      errorId
    )
  };
}

/**
 * File upload error handler
 */
function handleUploadError(error) {
  const errorId = uuidv4();
  console.error(`[ERROR ${errorId}] Upload Error:`, error.message);

  if (error.code === 'LIMIT_FILE_SIZE') {
    return {
      status: 413,
      response: createErrorResponse(
        'File too large',
        'The uploaded file exceeds the maximum allowed size',
        errorId
      )
    };
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return {
      status: 400,
      response: createErrorResponse(
        'Too many files',
        'You can only upload one file at a time',
        errorId
      )
    };
  }

  return {
    status: 400,
    response: createErrorResponse(
      'File upload failed',
      error.message,
      errorId
    )
  };
}

/**
 * Global error handling middleware
 */
function globalErrorHandler(err, req, res, next) {
  // Performance monitoring
  const requestDuration = req.startTime ? Date.now() - req.startTime : 0;
  
  // Log request context
  console.error('[ERROR] Request Context:', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    duration: requestDuration,
    error: err.message
  });

  let statusCode = 500;
  let errorResponse = createErrorResponse('Internal server error');

  // Handle different error types
  if (err.name && err.name.includes('DynamoDB') || err.$metadata) {
    const handled = handleDynamoDBError(err);
    statusCode = handled.status;
    errorResponse = handled.response;
  } else if (err.message.includes('auth') || err.message.includes('token') || 
             err.message.includes('permission') || err.message.includes('unauthorized')) {
    const handled = handleAuthError(err);
    statusCode = handled.status;
    errorResponse = handled.response;
  } else if (err.name === 'ValidationError' || err.message.includes('validation')) {
    const handled = handleValidationError(err);
    statusCode = handled.status;
    errorResponse = handled.response;
  } else if (err.code && err.code.startsWith('LIMIT_')) {
    const handled = handleUploadError(err);
    statusCode = handled.status;
    errorResponse = handled.response;
  } else if (err.status || err.statusCode) {
    // Express/HTTP errors
    statusCode = err.status || err.statusCode;
    errorResponse = createErrorResponse(
      err.message || 'An error occurred',
      err.details,
      uuidv4()
    );
  } else {
    // Generic error
    const errorId = uuidv4();
    console.error(`[ERROR ${errorId}] Unhandled Error:`, {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    
    errorResponse = createErrorResponse(
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? err.message : undefined,
      errorId
    );
  }

  // Add performance metrics to error response
  if (requestDuration > 5000) { // Log slow requests
    console.warn(`[SLOW REQUEST] ${req.method} ${req.url} took ${requestDuration}ms`);
    errorResponse.performance = {
      duration: requestDuration,
      slow: true
    };
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 error handler
 */
function notFoundHandler(req, res) {
  const errorResponse = createErrorResponse(
    'Endpoint not found',
    `${req.method} ${req.url} is not a valid endpoint`,
    uuidv4()
  );
  
  res.status(404).json(errorResponse);
}

/**
 * Request performance monitoring middleware
 */
function performanceMonitor(req, res, next) {
  req.startTime = Date.now();
  
  // Override res.json to add performance metrics
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - req.startTime;
    
    // Log performance metrics
    if (duration > 1000) {
      console.warn(`[PERF] Slow request: ${req.method} ${req.url} took ${duration}ms`);
    }
    
    // Add performance info to response in development
    if (process.env.NODE_ENV === 'development' && data && typeof data === 'object') {
      data._performance = {
        duration,
        timestamp: new Date().toISOString()
      };
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Async error wrapper
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Rate limiting error handler
 */
function rateLimitErrorHandler(req, res, next, options = {}) {
  const errorResponse = createErrorResponse(
    'Rate limit exceeded',
    `Too many requests. Try again in ${options.windowMs || 60000}ms`,
    uuidv4()
  );
  
  res.status(429).json(errorResponse);
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  performanceMonitor,
  asyncErrorHandler,
  rateLimitErrorHandler,
  createErrorResponse,
  handleDynamoDBError,
  handleAuthError,
  handleValidationError,
  handleUploadError
};