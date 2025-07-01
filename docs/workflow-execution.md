# Workflow Execution

This document explains how workflow execution works in the LLM Orchestration system.

## Overview

Workflow execution is the process of running a sequence of LLM interactions (payloads) in order, with the ability to pass context between them. The execution process is managed by the `execute.js` module.

## Execution Flow

1. A workflow execution is initiated via the API
2. A new run record is created in the database
3. Each payload in the workflow is processed sequentially:
   - Blocks in the payload are combined to form a prompt
   - Variables in the prompt are replaced with context from previous payloads
   - The prompt is sent to the configured LLM instance
   - The response is processed and stored
   - The response is added to the execution context for use by subsequent payloads
4. Real-time updates are sent via WebSocket during execution
5. When all payloads are processed, the run is marked as completed

## Context Management

The execution context is a JavaScript object that contains:

- `responses`: An array of previous responses from payloads in this run
- `variables`: Named values that can be referenced in prompts

### Variable Substitution

Variables in prompts use the `{{variable}}` syntax. When a prompt contains a variable reference, the system:

1. Looks for a payload response with that name in the context
2. If found, replaces the variable with the response content
3. If not found, leaves the variable reference unchanged

Example prompt with variable:
```
Please analyze the following text: {{previous_output}}
```

If a previous payload named "previous_output" has generated content, it will be substituted here.

## Run Lifecycle

A workflow run goes through these stages:

1. **Created**: Run record is created in the database
2. **Running**: Execution of payloads is in progress
3. **Completed**: All payloads have been executed successfully
4. **Failed**: An error occurred during execution

Each stage is tracked in the database and reflected in the UI.

## Real-Time Updates

During execution, the system sends real-time updates via WebSocket:

- `execution_progress`: Sent periodically with overall progress information
- `payload_completed`: Sent when a payload finishes executing
- `workflow_completed`: Sent when the entire workflow completes
- `workflow_failed`: Sent if the workflow execution fails

These updates allow the UI to show execution progress without polling the server.

## Error Handling

If an error occurs during execution:

1. The error is logged
2. The run status is updated to "failed"
3. A workflow_failed WebSocket message is sent
4. The error message is stored in the run's metadata

## API Endpoints

### Execute a Workflow

**POST /api/execute/workflow/:id**

Starts the execution of a workflow by its ID.

Response:
```json
{
  "runId": 123,
  "message": "Workflow execution started",
  "status": "running"
}
```

### Get Run Status

**GET /api/execute/run/:id**

Gets the status and results of a specific run.

Response:
```json
{
  "id": 123,
  "workflow_id": 456,
  "status": "completed",
  "started_at": "2023-07-01T12:00:00Z",
  "completed_at": "2023-07-01T12:05:00Z",
  "metadata": { ... },
  "responses": [ ... ]
}
```

## Implementation Details

The execution process is handled asynchronously to avoid blocking the server:

1. When a workflow execution is requested, the server immediately returns a response with the run ID
2. The actual execution happens in the background via the `executeWorkflowAsync` function
3. Clients can monitor progress via WebSocket or by polling the run status endpoint
