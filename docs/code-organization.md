# Code Organization Guidelines

This document outlines the code organization and naming conventions to maintain consistency across the LLM Orchestration codebase.

## File Organization

### Directory Structure

- **`/config`**: Configuration files
  - Database configuration
  - Environment-specific settings
  - Schema definitions

- **`/data`**: Data storage
  - Database files
  - Generated outputs
  - Temporary storage

- **`/docs`**: Documentation
  - Markdown documentation files
  - API references
  - Guides and tutorials

- **`/public`**: Frontend assets
  - HTML files
  - CSS styles
  - Client-side JavaScript
  - Static assets

- **`/routes`**: API endpoints
  - Route handlers for HTTP endpoints
  - Input validation
  - Response formatting

- **`/services`**: Core services
  - Business logic implementation
  - External service integrations
  - Utility functions

### File Naming Conventions

- Use **lowercase** for all filenames
- Use **kebab-case** (dash-separated) for multi-word filenames
- Use descriptive names that reflect the file's purpose
- Use consistent suffixes for similar files

Examples:
- `database.js` - Database configuration
- `llm-service.js` - LLM service implementation
- `workflow-execution.js` - Workflow execution logic

## Code Organization

### Import Order

Organize imports in the following order, with a blank line between each group:

1. Core Node.js modules (e.g., `fs`, `path`, `http`)
2. External dependencies (e.g., `express`, `sqlite3`)
3. Internal modules (e.g., `../config/database`, `../services/llm`)

Example:
```javascript
const path = require('path');
const fs = require('fs');

const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const db = require('../config/database');
const llmService = require('../services/llm');
```

### Class and Function Organization

Within a file, organize code in the following order:

1. Module imports
2. Constants and configuration
3. Class or function definitions (core functionality)
4. Helper/utility functions
5. Module exports

For classes, organize methods in the following order:

1. Constructor
2. Public methods
3. Private methods (prefixed with `_`)
4. Static methods

### Code Comments

- Use JSDoc style comments for functions and classes
- Prefix comments for AI assistance with specific labels:
  - `AI-CONTEXT`: Provides context about code patterns or design decisions
  - `AI-EXTENSION-POINT`: Marks places where new functionality can be added
  - `AI-CAUTION`: Warns about areas that require careful consideration

## Naming Conventions

### Variables and Functions

- Use **camelCase** for variables and function names
- Use descriptive names that reflect purpose
- Boolean variables should have prefix like `is`, `has`, or `should`
- Functions should be verbs or verb phrases

Examples:
- `userId`, `isAvailable`, `hasPermission`
- `getUser()`, `sendPrompt()`, `processResponse()`

### Constants

- Use **UPPER_SNAKE_CASE** for constants
- Place constants at the top of the file

Examples:
- `DEFAULT_TIMEOUT`, `MAX_RETRIES`, `API_VERSION`

### Classes

- Use **PascalCase** for class names
- Use singular nouns for class names

Examples:
- `Database`, `LLMService`, `WorkflowExecutor`

## Code Style

- Use 4 spaces for indentation
- Use single quotes for strings
- Add semicolons at the end of statements
- Limit line length to 100 characters
- Use explicit comparisons (`===` and `!==`)
- Avoid unnecessary nesting
- Use async/await for asynchronous operations

## Error Handling

- Use try/catch blocks for error handling
- Provide specific error messages
- Log errors with appropriate level (debug, info, warn, error)
- Include stack traces in development mode

Example:
```javascript
try {
    await database.executeQuery();
} catch (error) {
    console.error('Failed to execute database query:', error);
    throw new Error(`Database operation failed: ${error.message}`);
}
```

## Documentation

- Document all public API endpoints, functions, and classes
- Use JSDoc for code documentation
- Keep documentation updated when code changes
- Include examples for complex operations
