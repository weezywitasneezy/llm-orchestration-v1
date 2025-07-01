/**
 * LLM Orchestration Application
 * Error Handler Utilities
 * 
 * AI-CONTEXT: This module provides standardized error handling utilities
 * to ensure consistent error responses and logging throughout the application.
 * It separates operational errors from programming errors.
 */

const logger = require('../services/logger');
const errorLogger = logger.getContextLogger('ErrorHandler');

/**
 * Standard error types
 */
const ErrorTypes = {
    VALIDATION: 'ValidationError',
    NOT_FOUND: 'NotFoundError',
    DATABASE: 'DatabaseError',
    LLM_SERVICE: 'LlmServiceError',
    WORKFLOW: 'WorkflowError',
    UNAUTHORIZED: 'UnauthorizedError',
    FORBIDDEN: 'ForbiddenError',
    INTERNAL: 'InternalError'
};

/**
 * Create an application error with a specific type
 * @param {string} message - Error message
 * @param {string} type - Error type from ErrorTypes
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details (optional)
 * @returns {Error} - Enhanced error object
 */
function createError(message, type, statusCode, details = null) {
    const error = new Error(message);
    error.type = type;
    error.statusCode = statusCode;
    
    if (details) {
        error.details = details;
    }
    
    return error;
}

/**
 * Create a validation error
 * @param {string} message - Error message
 * @param {Object} validationErrors - Validation error details
 * @returns {Error} - Validation error
 */
function createValidationError(message, validationErrors) {
    return createError(
        message || 'Validation failed',
        ErrorTypes.VALIDATION,
        400,
        validationErrors
    );
}

/**
 * Create a not found error
 * @param {string} resource - The resource that wasn't found
 * @param {string|number} id - Resource ID or identifier
 * @returns {Error} - Not found error
 */
function createNotFoundError(resource, id) {
    return createError(
        `${resource} not found${id ? `: ${id}` : ''}`,
        ErrorTypes.NOT_FOUND,
        404
    );
}

/**
 * Create a database error
 * @param {string} message - Error message
 * @param {Error} originalError - Original database error
 * @returns {Error} - Database error
 */
function createDatabaseError(message, originalError) {
    return createError(
        message || 'Database operation failed',
        ErrorTypes.DATABASE,
        500,
        {
            originalError: process.env.NODE_ENV === 'development' 
                ? { message: originalError.message, stack: originalError.stack }
                : { message: originalError.message }
        }
    );
}

/**
 * Create an LLM service error
 * @param {string} message - Error message
 * @param {Error} originalError - Original LLM service error
 * @returns {Error} - LLM service error
 */
function createLlmServiceError(message, originalError) {
    return createError(
        message || 'LLM service operation failed',
        ErrorTypes.LLM_SERVICE,
        500,
        {
            originalError: process.env.NODE_ENV === 'development' 
                ? { message: originalError.message, stack: originalError.stack }
                : { message: originalError.message }
        }
    );
}

/**
 * Handle an error in an Express route handler
 * @param {Error} error - The error to handle
 * @param {Object} res - Express response object
 */
function handleRouteError(error, res) {
    // Log the error
    if (error.statusCode >= 500) {
        errorLogger.error(`Server error: ${error.message}`, error);
    } else {
        errorLogger.debug(`Client error: ${error.message}`, error);
    }
    
    // Default status is 500 (Internal Server Error)
    const statusCode = error.statusCode || 500;
    
    // Prepare response body
    const errorResponse = {
        error: error.type || 'InternalError',
        message: error.message || 'An unexpected error occurred'
    };
    
    // Add details in development mode or for validation errors
    if (error.details && (error.type === ErrorTypes.VALIDATION || process.env.NODE_ENV === 'development')) {
        errorResponse.details = error.details;
    }
    
    // Add stack trace in development mode for server errors
    if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
        errorResponse.stack = error.stack;
    }
    
    // Send response
    res.status(statusCode).json(errorResponse);
}

module.exports = {
    ErrorTypes,
    createError,
    createValidationError,
    createNotFoundError,
    createDatabaseError,
    createLlmServiceError,
    handleRouteError
};
