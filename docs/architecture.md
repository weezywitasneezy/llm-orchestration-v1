# LLM Orchestration Architecture

This document provides an overview of the LLM Orchestration project architecture, explaining how the different components interact.

## System Overview

The LLM Orchestration system allows users to create and execute workflows that involve multiple LLM (Large Language Model) interactions. The system is designed around these core concepts:

- **Blocks**: Reusable text snippets that can be combined to form prompts
- **Payloads**: Collections of blocks with LLM configuration that define a single LLM interaction
- **Workflows**: Sequences of payloads that are executed in order, with context passed between them
- **Runs**: Execution instances of workflows, including their responses and metrics

## Architecture Diagram

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Web Browser  │◄────┤  Express.js   │◄────┤  Database     │
│  (Frontend)   │     │  (API Server) │     │  (SQLite)     │
└───────┬───────┘     └───────┬───────┘     └───────────────┘
        │                     │
        │  WebSocket          │
        └─────────────────────┘
                     ▲
                     │
                     ▼
               ┌───────────────┐
               │  LLM Service  │
               │  (HTTP API)   │
               └───────────────┘
```

## Component Relationships

- The **Frontend** communicates with the **API Server** to manage blocks, payloads, workflows, and view execution results
- **WebSockets** provide real-time updates during workflow execution
- The **LLM Service** manages communication with different LLM instances (running on different ports)
- The **Database** stores all persistent data using SQLite

## Core Components

### Server (`server.js`)

The main application entry point that:
- Sets up the Express application and middleware
- Initializes WebSocket for real-time communication
- Configures API routes
- Manages server lifecycle and shutdown

### Services (`services/`)

- `llm.js`: Core service for communicating with LLM instances
- `init-llm.js`: Initialization service for LLM instances

### Routes (`routes/`)

- `blocks.js`: Manages block resources
- `payloads.js`: Manages payload resources 
- `workflows.js`: Manages workflow resources
- `execute.js`: Handles workflow execution
- `runs.js`: Provides access to run results
- `llm.js`: Exposes LLM-related functionality
- `database.js`: Database management utilities

### Database (`config/database.js`)

Provides database access and schema management with:
- Table creation and migrations
- Transaction support
- Query utilities
- Error recovery

### Frontend (`public/`)

- `index.html`: Single-page application interface
- `js/`: Frontend JavaScript modules
- `css/`: Styling for the application

## Data Flow

1. Users create blocks, payloads, and workflows through the web interface
2. When a workflow is executed:
   - A new run record is created
   - The system processes each payload in sequence
   - Variable substitution is performed on prompts
   - Prompts are sent to the configured LLM instances
   - Responses are stored and added to the execution context
   - Real-time updates are sent via WebSocket
3. Results can be viewed in the Runs/Responses tab

## Extension Points

The system can be extended in several ways:
- Add new LLM model formats in `services/llm.js`
- Implement additional API endpoints in the routes directory
- Create new frontend components in the public directory
