# Project File Structure

This document outlines the structure of the LLM Orchestration project and describes the purpose of each major component.

## Root Directory

```
.
├── config/            # Configuration files
├── data/              # Data storage directory
├── docs/              # Documentation files
│   ├── schemas/       # JSON Schema definitions
│   └── templates/     # Code templates
├── public/            # Static web assets
├── routes/            # API route handlers
├── services/          # Core service implementations
├── utils/             # Utility functions
├── .editorconfig      # Editor configuration
├── .env               # Environment variables
├── .eslintrc.js       # ESLint configuration
├── ai-config.json     # AI-friendly configuration
├── package.json       # Project dependencies and scripts
├── README.md          # Project overview
├── server.js          # Main application entry point
└── filestructure.md   # This file
```

## Core Components

### Services (`services/`)
- `llm.js` - Core LLM service implementation
  - Manages communication with LLM instances running on different ports
  - Implements a singleton service pattern with instance tracking
  - Features:
    - Instance registration and status tracking
    - Default configuration management
    - Health checks and availability monitoring
    - Support for multiple API formats (Kobold, OpenAI-compatible)
    - Prompt formatting for different model types
    - Response processing and error recovery
    - Retry logic and timeout management
    - Corrupted text cleaning and validation
  - Key methods:
    - `registerInstance(port, name, config)`: Register new LLM instances
    - `checkInstanceAvailability(port)`: Monitor instance health
    - `sendPrompt(port, prompt, config)`: Send prompts to LLMs
    - `processResponse(response)`: Handle and format LLM responses
    - `formatPromptForModel(prompt, modelFormat)`: Format prompts for different models

- `init-llm.js` - LLM initialization service
  - Automatically runs when llm.js is imported
  - Development environment features:
    - Sets up simulated LLM instances
    - Configures test instances on common ports (5001, 5002, 5003)
    - Enables LLM simulation mode
    - Provides different model configurations for testing
  - Production environment:
    - Handles real LLM instance initialization
    - Validates configuration
    - Sets up monitoring

- `logger.js` - Logging service
  - Provides standardized logging across the application
  - Features:
    - Different log levels (ERROR, WARN, INFO, DEBUG)
    - Context-based loggers for components
    - Environment-aware logging
    - Consistent formatting
  - Key methods:
    - `error()`: Log error messages
    - `warn()`: Log warning messages
    - `info()`: Log informational messages
    - `debug()`: Log debug messages
    - `getContextLogger()`: Create component-specific logger

### Routes (`routes/`)
- `execute.js` - Workflow execution endpoints
  - Core functionality:
    - Workflow orchestration and execution
    - Context management for variable replacement
    - WebSocket integration for real-time updates
    - Block execution and dependency handling
  - Key features:
    - Variable replacement in prompts using context
    - Previous response appending
    - Asynchronous workflow execution
    - Real-time status updates via WebSocket
    - Error handling and recovery
  - Main endpoints:
    - POST /execute/workflow/:id - Execute a workflow
    - GET /execute/run/:id - Get execution status

- `blocks.js` - Block management endpoints
  - Create, read, update, delete blocks
  - Retrieve blocks with filtering and searching
  - Organize blocks in virtual folders

- `payloads.js` - Payload management endpoints
  - Create, read, update, delete payloads
  - Associate blocks with payloads
  - Configure LLM settings for payloads

- `workflows.js` - Workflow management endpoints
  - Create, read, update, delete workflows
  - Associate payloads with workflows
  - Manage payload execution order

- `runs.js` - Run results and history
  - Retrieve run history and results
  - Access execution metrics and statistics
  - Filter and query past runs

- `llm.js` - LLM management endpoints
  - Get LLM instance information
  - Test connectivity to LLM instances
  - Retrieve detailed model information

- `database.js` - Database management
  - Database maintenance operations
  - Migration utilities
  - Backup and restore functionality

### Utilities (`utils/`)
- `error-handler.js` - Error handling utilities
  - Standard error types and creation functions
  - Route error handling middleware
  - Error response formatting
  - Development vs. production error details

- `validation.js` - Input validation utilities
  - Schema validation functions
  - Type validation functions
  - Required field validation
  - Custom validator support

- `string-utils.js` - String manipulation utilities
  - String truncation
  - Slug generation
  - Variable extraction and substitution
  - Whitespace normalization

- `schemas.js` - Schema definitions for validation
  - Validation rules for all data types
  - Compatible with validation utilities
  - Required field specifications
  - Type and range validation

- `index.js` - Unified export of all utilities
  - Simplifies imports in other modules
  - Re-exports all utility functions
  - Maintains original module access

### Configuration (`config/`)
- `database.js` - Database configuration
  - Manages database connections and queries
  - Implements connection pooling
  - Handles transaction management
  - Provides error recovery mechanisms
  - Includes schema definitions and migrations

### Public Assets (`public/`)
- `index.html` - Main web interface
  - React-based UI components
  - Real-time workflow monitoring
  - Block configuration interface
  - Execution status display

- `js/` - Frontend JavaScript
  - `app.js` - Main application logic
  - `api.js` - API client functions
  - `blocks.js` - Block management UI
  - `payloads.js` - Payload management UI
  - `workflows.js` - Workflow management UI
  - `runs-manager.js` - Run history UI
  - `error-handler.js` - Error handling utilities
  - `workflow-patch.js` - Workflow updates
  - `llm-tester.js` - LLM testing utilities
  - `database-manager.js` - Database management UI

- `css/` - Styling
  - `style.css` - Application styles

### Documentation (`docs/`)
- `architecture.md` - System architecture overview
- `api-reference.md` - API documentation
- `database.md` - Database schema and operations
- `getting-started.md` - Setup and usage guide
- `llm-service.md` - LLM service documentation
- `workflow-execution.md` - Workflow execution process
- `code-organization.md` - Code style and organization guidelines
- `index.md` - Documentation index and navigation

- `schemas/` - JSON Schema definitions
  - `blocks.json` - Blocks table schema
  - `payloads.json` - Payloads table schema
  - `payload_blocks.json` - Payload-to-blocks junction table schema
  - `workflows.json` - Workflows table schema
  - `workflow_payloads.json` - Workflow-to-payloads junction table schema
  - `runs.json` - Runs table schema
  - `responses.json` - Responses table schema
  - `api-schemas.json` - API request/response schemas
  - `er-diagram.md` - Entity relationship diagram
  - `index.md` - Schema documentation index

- `templates/` - Code templates for consistency
  - `service-template.js` - Template for new services
  - `route-template.js` - Template for new API routes

### AI-Friendly Configuration (`ai-config.json`)
- Project structure information
- Extension points documentation
- Common code patterns
- Naming conventions
- File organization guidance
- AI-specific comment labels

## Technical Implementation

### LLM Integration
- Supports multiple LLM backends:
  - Kobold API (primary)
  - OpenAI-compatible API (fallback)
  - Custom API implementations
- Model formats:
  - Mistral (chat completions)
  - Llama (instruction format)
  - Llama (chat format)
  - Command-R (Cohere style)
  - Default format
- Features:
  - Automatic format detection
  - Fallback mechanisms
  - Response normalization
  - Error recovery

### WebSocket System
- Real-time updates during execution
- Event types:
  - execution_progress: Overall progress updates
  - payload_completed: Individual payload completions
  - workflow_completed: Workflow completion notification
  - workflow_failed: Error notifications

### Workflow System
- Components:
  - Blocks (individual LLM operations)
  - Workflows (block sequences)
  - Payloads (data containers)
  - Runs (execution instances)
- Features:
  - Variable substitution
  - Context management
  - Dependency tracking
  - Real-time monitoring
  - Error handling

### Development Guidelines

1. Service Layer:
   - Use singleton pattern for services
   - Implement proper error handling
   - Include comprehensive logging
   - Follow established patterns

2. Route Handlers:
   - Keep focused on request/response
   - Implement proper validation
   - Use middleware for common operations
   - Handle errors appropriately

3. Frontend:
   - Follow React best practices
   - Implement proper state management
   - Handle loading and error states
   - Provide real-time updates

4. Testing:
   - Write unit tests for services
   - Include integration tests
   - Test error scenarios
   - Validate edge cases

5. Code Organization:
   - Follow naming conventions in `code-organization.md`
   - Use templates for new files
   - Structure imports consistently
   - Add appropriate documentation
   - Include AI-CONTEXT comments for key sections

## Environment Setup

### Development
- Node.js environment
- Required environment variables:
  - NODE_ENV=development
  - SIMULATE_LLM=true (optional)
  - Database connection details
  - Port configurations

### Production
- Node.js environment
- Required environment variables:
  - NODE_ENV=production
  - Database credentials
  - API keys
  - Security configurations
