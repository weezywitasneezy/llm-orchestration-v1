/**
 * LLM Orchestration Application
 * Validation Utilities
 * 
 * AI-CONTEXT: This module provides reusable validation functions for
 * validating input data throughout the application. Using these consistent
 * validation helpers ensures uniform error handling and user feedback.
 */

const logger = require('../services/logger');
const validationLogger = logger.getContextLogger('Validation');

/**
 * Validate required fields in an object
 * @param {Object} data - The object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} - Object with isValid flag and optional error message
 */
function validateRequired(data, requiredFields) {
    const missingFields = [];
    
    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            missingFields.push(field);
        }
    }
    
    if (missingFields.length > 0) {
        const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
        validationLogger.debug('Validation failed', { data, missingFields });
        return {
            isValid: false,
            error: errorMessage
        };
    }
    
    return { isValid: true };
}

/**
 * Validate that a value is a number and within a specified range
 * @param {any} value - The value to validate
 * @param {Object} options - Validation options
 * @param {number} [options.min] - Minimum allowed value (optional)
 * @param {number} [options.max] - Maximum allowed value (optional)
 * @param {boolean} [options.integer=false] - Whether value must be an integer
 * @returns {Object} - Object with isValid flag and optional error message
 */
function validateNumber(value, options = {}) {
    const { min, max, integer = false } = options;
    
    // Check if it's a number
    const numValue = Number(value);
    if (isNaN(numValue)) {
        return {
            isValid: false,
            error: `Value must be a number`
        };
    }
    
    // Check if it's an integer if required
    if (integer && !Number.isInteger(numValue)) {
        return {
            isValid: false,
            error: `Value must be an integer`
        };
    }
    
    // Check min constraint
    if (min !== undefined && numValue < min) {
        return {
            isValid: false,
            error: `Value must be greater than or equal to ${min}`
        };
    }
    
    // Check max constraint
    if (max !== undefined && numValue > max) {
        return {
            isValid: false,
            error: `Value must be less than or equal to ${max}`
        };
    }
    
    return { isValid: true };
}

/**
 * Validate string length
 * @param {string} value - The string to validate 
 * @param {Object} options - Validation options
 * @param {number} [options.minLength] - Minimum length (optional)
 * @param {number} [options.maxLength] - Maximum length (optional)
 * @returns {Object} - Object with isValid flag and optional error message
 */
function validateString(value, options = {}) {
    const { minLength, maxLength } = options;
    
    // Check if it's a string
    if (typeof value !== 'string') {
        return {
            isValid: false,
            error: 'Value must be a string'
        };
    }
    
    // Check min length
    if (minLength !== undefined && value.length < minLength) {
        return {
            isValid: false,
            error: `String must be at least ${minLength} characters long`
        };
    }
    
    // Check max length
    if (maxLength !== undefined && value.length > maxLength) {
        return {
            isValid: false,
            error: `String must be at most ${maxLength} characters long`
        };
    }
    
    return { isValid: true };
}

/**
 * Validate that a value is one of a set of allowed values
 * @param {any} value - The value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @returns {Object} - Object with isValid flag and optional error message
 */
function validateEnum(value, allowedValues) {
    if (!allowedValues.includes(value)) {
        return {
            isValid: false,
            error: `Value must be one of: ${allowedValues.join(', ')}`
        };
    }
    
    return { isValid: true };
}

/**
 * Validate an object schema
 * @param {Object} data - The object to validate
 * @param {Object} schema - Schema object defining validation rules
 * @returns {Object} - Object with isValid flag and errors object
 * 
 * Schema format:
 * {
 *   fieldName: {
 *     required: true,
 *     type: 'string' | 'number' | 'boolean' | 'object' | 'array',
 *     validate: (value) => ({ isValid: true }) // Optional custom validator
 *   }
 * }
 */
function validateSchema(data, schema) {
    const errors = {};
    
    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        
        // Check required fields
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors[field] = `Field is required`;
            continue;
        }
        
        // Skip validation for undefined optional fields
        if (value === undefined) {
            continue;
        }
        
        // Validate type
        if (rules.type) {
            const valueType = Array.isArray(value) ? 'array' : typeof value;
            if (valueType !== rules.type) {
                errors[field] = `Field must be of type ${rules.type}`;
                continue;
            }
        }
        
        // Apply custom validator if provided
        if (rules.validate && typeof rules.validate === 'function') {
            const result = rules.validate(value);
            if (!result.isValid) {
                errors[field] = result.error;
            }
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

module.exports = {
    validateRequired,
    validateNumber,
    validateString,
    validateEnum,
    validateSchema
};
