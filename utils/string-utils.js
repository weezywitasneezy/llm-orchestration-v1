/**
 * LLM Orchestration Application
 * String Utility Functions
 * 
 * AI-CONTEXT: This module provides reusable utilities for common string
 * operations used throughout the application. Using these consistent
 * helpers ensures uniform string handling.
 */

/**
 * Truncate a string to a maximum length, adding ellipsis if truncated
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} [ellipsis='...'] - Ellipsis string to append
 * @returns {string} - Truncated string
 */
function truncate(str, maxLength, ellipsis = '...') {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    if (str.length <= maxLength) {
        return str;
    }
    
    return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Convert a string to slug format (lowercase, dash-separated)
 * @param {string} str - The string to convert
 * @returns {string} - Slugified string
 */
function slugify(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Sanitize a string for safe display (remove HTML tags)
 * @param {string} str - The string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitize(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Extract variables from a string using a specified pattern
 * @param {string} str - The string to extract from
 * @param {RegExp} pattern - Regular expression with capturing groups
 * @returns {Array<string>} - Array of extracted variables
 */
function extractVariables(str, pattern = /\{\{([^}]+)\}\}/g) {
    if (!str || typeof str !== 'string') {
        return [];
    }
    
    const matches = [];
    let match;
    
    while ((match = pattern.exec(str)) !== null) {
        matches.push(match[1]);
    }
    
    return matches;
}

/**
 * Check if a string contains variables using a specified pattern
 * @param {string} str - The string to check
 * @param {RegExp} pattern - Regular expression for variables
 * @returns {boolean} - True if the string contains variables
 */
function containsVariables(str, pattern = /\{\{([^}]+)\}\}/g) {
    if (!str || typeof str !== 'string') {
        return false;
    }
    
    return pattern.test(str);
}

/**
 * Replace variables in a string with values from a context object
 * @param {string} str - The string with variables
 * @param {Object} context - Object with variable values
 * @param {RegExp} pattern - Regular expression for variables
 * @returns {string} - String with variables replaced
 */
function replaceVariables(str, context, pattern = /\{\{([^}]+)\}\}/g) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    if (!context || typeof context !== 'object') {
        return str;
    }
    
    return str.replace(pattern, (match, variable) => {
        return context[variable] !== undefined ? context[variable] : match;
    });
}

/**
 * Normalize whitespace in a string (trim and replace multiple spaces with single space)
 * @param {string} str - The string to normalize
 * @returns {string} - Normalized string
 */
function normalizeWhitespace(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.trim().replace(/\s+/g, ' ');
}

/**
 * Convert a string to title case
 * @param {string} str - The string to convert
 * @returns {string} - Title cased string
 */
function toTitleCase(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

module.exports = {
    truncate,
    slugify,
    sanitize,
    extractVariables,
    containsVariables,
    replaceVariables,
    normalizeWhitespace,
    toTitleCase
};
