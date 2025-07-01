/**
 * LLM Orchestration Application
 * Logger Service
 * 
 * AI-CONTEXT: This module provides standardized logging functionality
 * throughout the application. It follows the singleton pattern and
 * provides different log levels with consistent formatting.
 */

// Set default log level based on environment
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Configuration with environment-based defaults
const CONFIG = {
    LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG'),
    INCLUDE_TIMESTAMP: process.env.LOG_INCLUDE_TIMESTAMP !== 'false',
    INCLUDE_LEVEL: process.env.LOG_INCLUDE_LEVEL !== 'false'
};

/**
 * Logger class for standardized logging
 * 
 * AI-CONTEXT: This service provides consistent logging patterns
 * throughout the application, with support for different log levels
 * and contextual information.
 */
class Logger {
    constructor() {
        this.logLevel = LOG_LEVELS[CONFIG.LOG_LEVEL] || LOG_LEVELS.INFO;
    }
    
    /**
     * Set the log level
     * @param {string} level - The log level (ERROR, WARN, INFO, DEBUG)
     */
    setLogLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
            this.logLevel = LOG_LEVELS[level];
            this.info(`Log level set to ${level}`);
        } else {
            this.warn(`Invalid log level: ${level}. Using current level: ${this.getLogLevelName()}`);
        }
    }
    
    /**
     * Get the current log level name
     * @returns {string} - The log level name
     */
    getLogLevelName() {
        return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.logLevel) || 'UNKNOWN';
    }
    
    /**
     * Format a log message with optional context
     * @param {string} level - The log level
     * @param {string} message - The log message
     * @param {Object} context - Additional context (optional)
     * @returns {string} - The formatted log message
     */
    _formatMessage(level, message, context) {
        const parts = [];
        
        // Add timestamp if configured
        if (CONFIG.INCLUDE_TIMESTAMP) {
            parts.push(`[${new Date().toISOString()}]`);
        }
        
        // Add log level if configured
        if (CONFIG.INCLUDE_LEVEL) {
            parts.push(`[${level}]`);
        }
        
        // Add message
        parts.push(message);
        
        // Format into string
        let formattedMessage = parts.join(' ');
        
        // Add context if available
        if (context && Object.keys(context).length > 0) {
            try {
                formattedMessage += ` ${JSON.stringify(context)}`;
            } catch (error) {
                formattedMessage += ` [Context serialization failed: ${error.message}]`;
            }
        }
        
        return formattedMessage;
    }
    
    /**
     * Log an error message
     * @param {string} message - The error message
     * @param {Error|Object} errorOrContext - Error object or additional context
     */
    error(message, errorOrContext) {
        if (this.logLevel >= LOG_LEVELS.ERROR) {
            if (errorOrContext instanceof Error) {
                const errorContext = {
                    error: errorOrContext.message,
                    stack: process.env.NODE_ENV === 'development' ? errorOrContext.stack : undefined
                };
                console.error(this._formatMessage('ERROR', message, errorContext));
            } else {
                console.error(this._formatMessage('ERROR', message, errorOrContext));
            }
        }
    }
    
    /**
     * Log a warning message
     * @param {string} message - The warning message
     * @param {Object} context - Additional context (optional)
     */
    warn(message, context) {
        if (this.logLevel >= LOG_LEVELS.WARN) {
            console.warn(this._formatMessage('WARN', message, context));
        }
    }
    
    /**
     * Log an info message
     * @param {string} message - The info message
     * @param {Object} context - Additional context (optional)
     */
    info(message, context) {
        if (this.logLevel >= LOG_LEVELS.INFO) {
            console.info(this._formatMessage('INFO', message, context));
        }
    }
    
    /**
     * Log a debug message
     * @param {string} message - The debug message
     * @param {Object} context - Additional context (optional)
     */
    debug(message, context) {
        if (this.logLevel >= LOG_LEVELS.DEBUG) {
            console.debug(this._formatMessage('DEBUG', message, context));
        }
    }
    
    /**
     * Create a contextualized logger for a specific component
     * @param {string} component - The component name
     * @returns {Object} - A logger with component context
     */
    getContextLogger(component) {
        return {
            error: (message, errorOrContext) => this.error(`[${component}] ${message}`, errorOrContext),
            warn: (message, context) => this.warn(`[${component}] ${message}`, context),
            info: (message, context) => this.info(`[${component}] ${message}`, context),
            debug: (message, context) => this.debug(`[${component}] ${message}`, context)
        };
    }
}

/* AI-CONTEXT: This creates a singleton instance of the Logger.
   Throughout the application, this single instance should be imported 
   to ensure consistent logging behavior. */
const logger = new Logger();

// Export the logger instance
module.exports = logger;
