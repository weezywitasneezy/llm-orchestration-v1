# API Reference

This document provides a reference for all API endpoints in the LLM Orchestration system.

## Base URL

All API endpoints use the base URL:

```
/api
```

## Blocks API

### Get All Blocks

**GET /api/blocks**

Returns a list of all blocks.

Example response:
```json
[
  {
    "id": 1,
    "title": "Introduction",
    "content": "This is an introduction block",
    "tags": "intro,greeting",
    "folder_path": "Common",
    "created_at": "2023-07-01T12:00:00Z",
    "updated_at": "2023-07-01T12:00:00Z"
  }
]
```

### Get Block by ID

**GET /api/blocks/:id**

Returns a single block by ID.

Example response:
```json
{
  "id": 1,
  "title": "Introduction",
  "content": "This is an introduction block",
  "tags": "intro,greeting",
  "folder_path": "Common",
  "created_at": "2023-07-01T12:00:00Z",
  "updated_at": "2023-07-01T12:00:00Z"
}
```

### Create Block

**POST /api/blocks**

Creates a new block.

Request body:
```json
{
  "title": "Introduction",
  "content": "This is an introduction block",
  "tags": "intro,greeting",
  "folder_path": "Common"
}
```

Example response:
```json
{
  "id": 1,
  "title": "Introduction",
  "content": "This is an introduction block",
  "tags": "intro,greeting",
  "folder_path": "Common",
  "created_at": "2023-07-01T12:00:00Z",
  "updated_at": "2023-07-01T12:00:00Z"
}
```

### Update Block

**PUT /api/blocks/:id**

Updates an existing block.

Request body:
```json
{
  "title": "Updated Introduction",
  "content": "This is an updated introduction block",
  "tags": "intro,greeting,updated",
  "folder_path": "Common"
}
```

Example response:
```json
{
  "id": 1,
  "title": "Updated Introduction",
  "content": "This is an updated introduction block",
  "tags": "intro,greeting,updated",
  "folder_path": "Common",
  "created_at": "2023-07-01T12:00:00Z",
  "updated_at": "2023-07-01T12:05:00Z"
}
```

### Delete Block

**DELETE /api/blocks/:id**

Deletes a block.

Example response:
```json
{
  "message": "Block deleted successfully"
}
```

## Payloads API

### Get All Payloads

**GET /api/payloads**

Returns a list of all payloads with their blocks.

Example response:
```json
[
  {
    "id": 1,
    "name": "Initial Request",
    "temperature": 0.7,
    "response_length": 1000,
    "llm_port": 5001,
    "model_format": "mistral",
    "created_at": "2023-07-01T12:00:00Z",
    "updated_at": "2023-07-01T12:00:00Z",
    "blocks": [
      {
        "id": 1,
        "title": "Introduction",
        "content": "This is an introduction block",
        "order_index": 0
      }
    ]
  }
]
```

### Get Payload by ID

**GET /api/payloads/:id**

Returns a single payload by ID with its blocks.

Example response:
```json
{
  "id": 1,
  "name": "Initial Request",
  "temperature": 0.7,
  "response_length": 1000,
  "llm_port": 5001,
  "model_format": "mistral",
  "created_at": "2023-07-01T12:00:00Z",
  "updated_at": "2023-07-01T12:00:00Z",
  "blocks": [
    {
      "id": 1,
      "title": "Introduction",
      "content": "This is an introduction block",
      "order_index": 0
    }
  ]
}
```

### Create Payload

**POST /api/payloads**

Creates a new payload.

Request body:
```json
{
  "name": "Initial Request",
  "temperature": 0.7,
  "response_length": 1000,
  "llm_port": 5001,
  "model_format": "mistral",
  "blocks": [1, 2, 3]
}
```

Example response:
```json
{
  "id": 1,
  "name": "Initial Request",
  "temperature": 0.7,
  "response_length": 1000,
  "llm_port": 5001,
  "model_format": "mistral",
  "created_at": "2023-07-01T12:00:00Z",
  "updated_at": "2023-07-01T12:00:00Z"
}
```

### Update Payload

**PUT /api/payloads/:id**

Updates an existing payload.

Request body:
```json
{
  "name": "Updated Request",
  "temperature": 0.6,
  "response_length": 2000,
  "llm_port": 5002,
  "model_format": "llama",
  "blocks": [1, 4, 5]
}
```

Example response:
```json
{
  "id": 1,
  "name": "Updated Request",
  "temperature": 0.6,
  "response_length": 2000,
  "llm_port": 5002,
  "model_format": "llama",
  "created_at": "2023-07-01T12:00:00Z",
  "updated_at": "2023-07-01T12:05:00Z"
}
```

### Delete Payload

**DELETE /api/payloads/:id**

Deletes a payload.

Example response:
```json
{
  "message": "Payload deleted successfully"
}
```

## Workflows API

### Get All Workflows

**GET /api/workflows**

Returns a list of all workflows.

Example response:
```json
[
  {
    "id": 1,
    "name": "Analysis Workflow",
    "created_at": "2023-07-01T12:00:00Z",
    "updated_at": "2023-07-01T12:00:00Z",
    "payloads": [
      {
        "id": 1,
        "name": "Initial Request",
        "order_index": 0
      },
      {
        "id": 2,
        "name": "Follow-up Analysis",
        "order_index": 1
      }
    ]
  }
]
```

### Get Workflow by ID

**GET /api/workflows/:id**

Returns a single workflow by ID with its payloads.

Example response:
```json
{
  "id": 1,
  "name": "Analysis Workflow",
  "created_at": "2023-07-01T12:00:00Z",
  "updated_at": "2023-07-01T12:00:00Z",
  "payloads": [
    {
      "id": 1,
      "name": "Initial Request",
      "order_index": 0
    },
    {
      "id": 2,
      "name": "Follow-up Analysis",
      "order_index": 1
    }
  ]
}
```

### Create Workflow

**POST /api/workflows**

Creates a new workflow.

Request body:
```json
{
  "name": "Analysis Workflow",
  "payloads": [1, 2]
}
```

Example response:
```json
{
  "id": 1,
  "name": "Analysis Workflow",
  "created_at": "2023-07-01T12:00:00Z",
  "updated_at": "2023-07-01T12:00:00Z"
}
```

### Update Workflow

**PUT /api/workflows/:id**

Updates an existing workflow.

Request body:
```json
{
  "name": "Updated Analysis Workflow",
  "payloads": [1, 3, 2]
}
```

Example response:
```json
{
  "id": 1,
  "name": "Updated Analysis Workflow",
  "created_at": "2023-07-01T12:00:00Z",
  "updated_at": "2023-07-01T12:05:00Z"
}
```

### Delete Workflow

**DELETE /api/workflows/:id**

Deletes a workflow.

Example response:
```json
{
  "message": "Workflow deleted successfully"
}
```

## Execute API

### Execute Workflow

**POST /api/execute/workflow/:id**

Executes a workflow by ID.

Example response:
```json
{
  "runId": 1,
  "message": "Workflow execution started",
  "status": "running"
}
```

### Get Run Status

**GET /api/execute/run/:id**

Gets the status and results of a run.

Example response:
```json
{
  "id": 1,
  "workflow_id": 1,
  "status": "completed",
  "started_at": "2023-07-01T12:00:00Z",
  "completed_at": "2023-07-01T12:05:00Z",
  "metadata": {
    "workflow_name": "Analysis Workflow",
    "total_payloads": 2,
    "started_at": "2023-07-01T12:00:00Z",
    "completed_at": "2023-07-01T12:05:00Z"
  },
  "responses": [
    {
      "id": 1,
      "run_id": 1,
      "payload_id": 1,
      "content": "Generated response from the first payload",
      "metadata": {
        "tokens": 150,
        "promptTokens": 50,
        "completionTokens": 100,
        "duration_ms": 5000,
        "tokens_per_second": 30
      },
      "created_at": "2023-07-01T12:02:00Z"
    },
    {
      "id": 2,
      "run_id": 1,
      "payload_id": 2,
      "content": "Generated response from the second payload",
      "metadata": {
        "tokens": 200,
        "promptTokens": 80,
        "completionTokens": 120,
        "duration_ms": 6000,
        "tokens_per_second": 33
      },
      "created_at": "2023-07-01T12:05:00Z"
    }
  ]
}
```

## LLM API

### Get LLM Instances

**GET /api/llm/instances**

Returns a list of all registered LLM instances.

Example response:
```json
[
  {
    "port": 5001,
    "name": "Simulated LLM 1 (small)",
    "status": "available",
    "lastUsed": "2023-07-01T12:00:00Z",
    "config": {
      "temperature": 0.7,
      "max_length": 1000
    }
  },
  {
    "port": 5002,
    "name": "Simulated LLM 2 (medium)",
    "status": "available",
    "lastUsed": "2023-07-01T12:00:00Z",
    "config": {
      "temperature": 0.5, 
      "max_length": 2000
    }
  }
]
```

### Test LLM Connectivity

**GET /api/llm/test/:port**

Tests connectivity to an LLM instance.

Example response:
```json
{
  "connected": true,
  "modelInfo": {
    "model": "Mistral-7B",
    "version": "1.0"
  },
  "timestamp": "2023-07-01T12:00:00Z"
}
```

### Get Detailed LLM Information

**GET /api/llm/info/:port**

Gets detailed information about an LLM instance.

Example response:
```json
{
  "port": 5001,
  "timestamp": "2023-07-01T12:00:00Z",
  "connected": true,
  "koboldApiAvailable": true,
  "openAiApiAvailable": true,
  "modelInfo": {
    "model": "Mistral-7B",
    "version": "1.0"
  },
  "apiDetails": {
    "kobold": {
      "model": "Mistral-7B",
      "version": "1.0"
    },
    "openai": {
      "data": [
        {
          "id": "local-model",
          "object": "model",
          "created": 1677610602,
          "owned_by": "user"
        }
      ]
    }
  },
  "endpointInfo": {
    "info": {
      "version": "1.0.0",
      "api_format": ["kobold", "openai"]
    }
  }
}
```

## Runs API

### Get All Runs

**GET /api/runs**

Returns a list of workflow runs.

Query parameters:
- `limit`: Number of runs to return (default: 50)
- `status`: Filter by status (optional)

Example response:
```json
[
  {
    "id": 1,
    "workflow_id": 1,
    "status": "completed",
    "started_at": "2023-07-01T12:00:00Z",
    "completed_at": "2023-07-01T12:05:00Z",
    "metadata": {
      "workflow_name": "Analysis Workflow",
      "total_payloads": 2
    }
  }
]
```

### Get Run by ID

**GET /api/runs/:id**

Returns a single run by ID.

Example response:
```json
{
  "id": 1,
  "workflow_id": 1,
  "status": "completed",
  "started_at": "2023-07-01T12:00:00Z",
  "completed_at": "2023-07-01T12:05:00Z",
  "metadata": {
    "workflow_name": "Analysis Workflow",
    "total_payloads": 2,
    "started_at": "2023-07-01T12:00:00Z",
    "completed_at": "2023-07-01T12:05:00Z"
  }
}
```

### Get Run Responses

**GET /api/runs/:id/responses**

Returns all responses for a run.

Example response:
```json
[
  {
    "id": 1,
    "run_id": 1,
    "payload_id": 1,
    "content": "Generated response from the first payload",
    "metadata": {
      "tokens": 150,
      "promptTokens": 50,
      "completionTokens": 100,
      "duration_ms": 5000,
      "tokens_per_second": 30
    },
    "created_at": "2023-07-01T12:02:00Z"
  },
  {
    "id": 2,
    "run_id": 1,
    "payload_id": 2,
    "content": "Generated response from the second payload",
    "metadata": {
      "tokens": 200,
      "promptTokens": 80,
      "completionTokens": 120,
      "duration_ms": 6000,
      "tokens_per_second": 33
    },
    "created_at": "2023-07-01T12:05:00Z"
  }
]
```

### Delete Run

**DELETE /api/runs/:id**

Deletes a run and all its responses.

Example response:
```json
{
  "message": "Run and associated responses deleted successfully"
}
```

## WebSocket Events

The system uses WebSockets for real-time updates. Connect to `/ws` and listen for these events:

### Execution Progress

```json
{
  "type": "execution_progress",
  "data": {
    "runId": 1,
    "payloadId": 1,
    "payloadName": "Initial Request",
    "status": "running",
    "progress": 50,
    "metadata": {
      "tokens_per_second": 30
    }
  }
}
```

### Payload Completed

```json
{
  "type": "payload_completed",
  "data": {
    "runId": 1,
    "payloadId": 1,
    "payloadName": "Initial Request",
    "content": "Generated response from the payload",
    "metadata": {
      "tokens": 150,
      "promptTokens": 50,
      "completionTokens": 100,
      "duration_ms": 5000,
      "tokens_per_second": 30
    }
  }
}
```

### Workflow Completed

```json
{
  "type": "workflow_completed",
  "data": {
    "runId": 1,
    "status": "completed"
  }
}
```

### Workflow Failed

```json
{
  "type": "workflow_failed",
  "data": {
    "runId": 1,
    "error": "Error message describing the failure"
  }
}
```
