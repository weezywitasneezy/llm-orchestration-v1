# Database Schema Documentation

This document provides an overview of the database schema used in the LLM Orchestration application. Each table is documented with its structure, relationships, and example data.

## Tables Overview

| Table | Description | Schema File |
|-------|-------------|-------------|
| blocks | Reusable text blocks for prompts | [blocks.json](./blocks.json) |
| payloads | LLM configurations with blocks | [payloads.json](./payloads.json) |
| payload_blocks | Junction table linking blocks to payloads | [payload_blocks.json](./payload_blocks.json) |
| workflows | Sequences of payloads to execute | [workflows.json](./workflows.json) |
| workflow_payloads | Junction table linking payloads to workflows | [workflow_payloads.json](./workflow_payloads.json) |
| runs | Execution instances of workflows | [runs.json](./runs.json) |
| responses | LLM-generated responses from runs | [responses.json](./responses.json) |

## Entity Relationships

```
┌─────────┐     ┌───────────────┐     ┌──────────┐     ┌────────────────┐     ┌─────────┐
│ blocks  │◄────┤ payload_blocks │◄────┤ payloads │◄────┤ workflow_payloads │◄────┤workflows│
└─────────┘     └───────────────┘     └──────────┘     └────────────────┘     └────┬────┘
                                                                                    │
                                                                                    │
                                                                                    ▼
                                                                               ┌─────────┐
                                                                               │  runs   │
                                                                               └────┬────┘
                                                                                    │
                                                                                    │
                                                                                    ▼
                                                                               ┌─────────┐
                                                                               │responses│
                                                                               └─────────┘
```

## Data Flow

1. **Blocks** are created as reusable text snippets
2. **Payloads** combine multiple blocks and add LLM configuration
3. **Workflows** sequence multiple payloads for execution
4. **Runs** represent execution instances of workflows
5. **Responses** store the results of each payload execution within a run

## Schema Format

Each schema file follows the JSON Schema format and includes:

- Property definitions with types and descriptions
- Required field specifications
- Example data
- Database table creation SQL
- Foreign key relationships

## Using These Schemas

These schema definitions can be used for:

1. **Documentation** - Understanding the data structure
2. **Validation** - Validating input data against the schema
3. **Code Generation** - Generating models or interfaces from the schema
4. **Database Creation** - Creating database tables from the SQL

## Example Usage

```javascript
const validation = require('../utils/validation');
const blocksSchema = require('./schemas/blocks.json');

function validateBlock(blockData) {
  return validation.validateSchema(blockData, {
    title: {
      required: true,
      type: 'string',
      validate: value => validation.validateString(value, { minLength: 1, maxLength: 255 })
    },
    content: {
      type: 'string'
    },
    tags: {
      type: 'string'
    },
    folder_path: {
      type: 'string'
    }
  });
}
```
