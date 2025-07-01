# Database Documentation

This document describes the database schema and operations in the LLM Orchestration system.

## Overview

The system uses SQLite as its database engine, with the database file stored in the `data` directory. The database module (`config/database.js`) provides a wrapper around SQLite operations with additional functionality for migrations and transactions.

## Schema

### Blocks

Blocks are reusable text snippets used to build prompts.

```sql
CREATE TABLE blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT,
    folder_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

- `id`: Unique identifier
- `title`: Block title/name
- `content`: The text content of the block
- `tags`: Comma-separated list of tags (used for categorization and referencing)
- `folder_path`: Virtual folder path for organization (e.g., "Phase 1/Instructions")
- `created_at`: When the block was created
- `updated_at`: When the block was last updated

### Payloads

Payloads are collections of blocks with LLM configuration.

```sql
CREATE TABLE payloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    temperature REAL DEFAULT 0.6,
    response_length INTEGER DEFAULT 1000,
    llm_port INTEGER DEFAULT 5001,
    model_format TEXT DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

- `id`: Unique identifier
- `name`: Payload name
- `temperature`: LLM temperature setting (controls randomness)
- `response_length`: Maximum length of response in tokens
- `llm_port`: Port number of the LLM instance to use
- `model_format`: Format to use for this model (e.g., 'mistral', 'llama')
- `created_at`: When the payload was created
- `updated_at`: When the payload was last updated

### Payload Blocks

Junction table linking blocks to payloads.

```sql
CREATE TABLE payload_blocks (
    payload_id INTEGER,
    block_id INTEGER,
    order_index INTEGER,
    FOREIGN KEY (payload_id) REFERENCES payloads (id) ON DELETE CASCADE,
    FOREIGN KEY (block_id) REFERENCES blocks (id) ON DELETE CASCADE
)
```

- `payload_id`: Reference to the payload
- `block_id`: Reference to the block
- `order_index`: Position of the block within the payload

### Workflows

Workflows are sequences of payloads executed together.

```sql
CREATE TABLE workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

- `id`: Unique identifier
- `name`: Workflow name
- `created_at`: When the workflow was created
- `updated_at`: When the workflow was last updated

### Workflow Payloads

Junction table linking payloads to workflows.

```sql
CREATE TABLE workflow_payloads (
    workflow_id INTEGER,
    payload_id INTEGER,
    order_index INTEGER,
    FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE,
    FOREIGN KEY (payload_id) REFERENCES payloads (id) ON DELETE CASCADE
)
```

- `workflow_id`: Reference to the workflow
- `payload_id`: Reference to the payload
- `order_index`: Position of the payload within the workflow

### Runs

Execution instances of workflows.

```sql
CREATE TABLE runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER,
    status TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE
)
```

- `id`: Unique identifier
- `workflow_id`: Reference to the executed workflow
- `status`: Current status ('running', 'completed', 'failed')
- `started_at`: When the run started
- `completed_at`: When the run finished (null if still running)
- `metadata`: JSON-serialized metadata about the run

### Responses

LLM responses generated during a run.

```sql
CREATE TABLE responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    payload_id INTEGER,
    content TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs (id) ON DELETE CASCADE,
    FOREIGN KEY (payload_id) REFERENCES payloads (id) ON DELETE SET NULL
)
```

- `id`: Unique identifier
- `run_id`: Reference to the run
- `payload_id`: Reference to the payload that generated this response
- `content`: The LLM-generated text
- `metadata`: JSON-serialized metadata (tokens, timing, etc.)
- `created_at`: When the response was created

## Database Operations

The database module provides these main operations:

### Initialization

```javascript
await database.initialize();
```

Creates the database file if it doesn't exist and sets up all tables.

### Querying

```javascript
// Get a single row
const workflow = await database.get('SELECT * FROM workflows WHERE id = ?', [workflowId]);

// Get multiple rows
const payloads = await database.all('SELECT * FROM payloads WHERE temperature > ?', [0.5]);

// Execute a statement (insert, update, delete)
const result = await database.run('INSERT INTO blocks (title, content) VALUES (?, ?)', 
  ['Introduction', 'This is an introduction block']);
console.log(result.lastID); // ID of the inserted row
```

### Transactions

```javascript
try {
  // Begin transaction
  await database.beginTransaction();
  
  // Perform multiple operations
  await database.run('INSERT INTO workflows (name) VALUES (?)', ['My Workflow']);
  const workflowId = result.lastID;
  
  await database.run('INSERT INTO workflow_payloads (workflow_id, payload_id, order_index) VALUES (?, ?, ?)',
    [workflowId, payloadId, 0]);
  
  // Commit transaction
  await database.commitTransaction();
} catch (error) {
  // Rollback on error
  await database.rollbackTransaction();
  throw error;
}
```

## Migration System

The database includes a built-in migration system to handle schema changes:

```javascript
async function checkAndMigrate() {
  // Example migration: rename a column
  const needsMigration = await database.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='old_table'"
  );
  
  if (needsMigration) {
    console.log('Running migration...');
    // Create new table, copy data, drop old table
  }
}
```

This system is automatically run during database initialization to ensure the schema is up to date.
