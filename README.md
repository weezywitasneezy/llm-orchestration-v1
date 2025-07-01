# LLM Orchestration

A system for orchestrating interactions with multiple Large Language Model (LLM) instances, providing workflow management, variable substitution, and real-time execution tracking.

## Project Overview

LLM Orchestration allows you to:

- Create reusable text blocks for LLM prompts
- Configure LLM settings for different types of requests
- Combine blocks into payloads that can be sent to LLMs
- Chain payloads into workflows with variable substitution
- Execute workflows and monitor them in real-time
- View and analyze execution results

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- Access to at least one LLM instance (local or remote)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/llm-orchestration.git
   cd llm-orchestration
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   NODE_ENV=development
   PORT=3000
   SIMULATE_LLM=true  # Set to 'false' in production
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open the application in your browser:
   ```
   http://localhost:3000
   ```

## Project Structure

```
.
├── config/            # Configuration files
├── data/              # Data storage directory
├── docs/              # Documentation files
│   ├── schemas/       # JSON Schema definitions
│   └── templates/     # Code templates
├── public/            # Frontend assets
├── routes/            # API endpoints
├── services/          # Core services
├── utils/             # Utility functions
└── server.js          # Main application entry point
```

For a detailed breakdown of the file structure, see [filestructure.md](./filestructure.md) or the [File Structure Diagram](./docs/file-structure-diagram.md).

## Development Guides

The project includes comprehensive guidelines for development:

- Code organization guidelines are available in `/docs/code-organization.md`
- File templates for new services and routes are in `/docs/templates/`
- ESLint configuration for code style consistency
- Editor configuration via `.editorconfig`

## Documentation

Full documentation is available in the `/docs` directory:

- [Getting Started Guide](./docs/getting-started.md)
- [Architecture Overview](./docs/architecture.md)
- [API Reference](./docs/api-reference.md)
- [Database Schema](./docs/database.md)
- [LLM Service](./docs/llm-service.md)
- [Workflow Execution](./docs/workflow-execution.md)
- [Code Organization](./docs/code-organization.md)
- [JSON Schemas](./docs/schemas/index.md)

## AI-Friendly Development

This project is designed to work well with AI coding assistants:

- Clear and consistent code organization
- Comprehensive documentation
- AI-context comments in key files
- [ai-config.json](./ai-config.json) with project info for AI tools

## License

[MIT](LICENSE)
