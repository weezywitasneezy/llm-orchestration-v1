# Getting Started with LLM Orchestration

This guide helps you set up and start using the LLM Orchestration system.

## Prerequisites

- Node.js 16.x or higher
- Access to at least one LLM instance (local or remote)

## Installation

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

## Running the Application

Start the server:
```bash
npm start
```

The application will be available at http://localhost:3000.

## Development Mode

In development mode:
- The application uses simulated LLM instances
- Test LLM instances are automatically set up on ports 5001, 5002, and 5003
- Real API calls are not made to LLM backends

To enable development mode, set `NODE_ENV=development` and `SIMULATE_LLM=true` in your `.env` file.

## Production Mode

In production mode:
- The application connects to real LLM instances
- You need to specify the ports where LLM instances are running
- LLM health checks are performed

To enable production mode, set `NODE_ENV=production` and `SIMULATE_LLM=false` in your `.env` file.

## Setting Up LLM Instances

### Local LLM Instances

You can run local LLM instances using tools like:
- [Kobold.cpp](https://github.com/LostRuins/koboldcpp)
- [LM Studio](https://lmstudio.ai/)
- [Ollama](https://ollama.ai/)

Configure these to run on different ports:
- Small model: Port 5001
- Medium model: Port 5002
- Large model: Port 5003

### Setting Up with Kobold.cpp

Example command to start a Kobold instance:
```bash
python koboldcpp.py --model models/mistral-7b-instruct.gguf --port 5001
```

### Setting Up with Ollama

```bash
# Start Ollama
ollama serve

# In another terminal, run a model on a specific port
ollama run mistral:7b-instruct -p 5001
```

## Creating Your First Workflow

1. **Create Blocks**: Navigate to the Block Manager tab and create text blocks for your prompts.

2. **Create a Payload**: Go to the Payload Builder tab and:
   - Create a new payload
   - Set a name (e.g., "Initial Query")
   - Configure LLM settings (temperature, response length, etc.)
   - Add blocks to the payload
   - Save the payload

3. **Create a Workflow**: Go to the Workflow tab and:
   - Create a new workflow
   - Add your payload(s) to the workflow
   - Save the workflow

4. **Execute the Workflow**: 
   - Click the "Execute Workflow" button
   - Monitor progress in real-time
   - View results in the Runs/Responses tab

## Using Variable Substitution

You can reference previous responses in your prompts:

```
Please analyze the following text: {{previous_analysis}}
```

If a payload named "previous_analysis" ran earlier in the workflow, its response will be substituted here.

## Example: Simple Analysis Workflow

Here's an example of a simple two-step workflow:

### Step 1: Create Blocks

1. Create a block named "Initial Prompt" with content:
   ```
   Analyze the following text for key themes:
   
   "Artificial intelligence has transformed industries from healthcare to transportation, 
   creating new opportunities and challenges. The rapid advancement of these technologies 
   raises questions about safety, ethics, and human oversight."
   ```

2. Create a block named "Follow-up Analysis" with content:
   ```
   Based on your initial analysis, please elaborate on the ethical considerations 
   and provide specific recommendations for addressing them:
   
   {{initial_analysis}}
   ```

### Step 2: Create Payloads

1. Create a payload named "initial_analysis":
   - LLM Port: 5001
   - Temperature: 0.7
   - Response Length: 1000
   - Add the "Initial Prompt" block

2. Create a payload named "detailed_ethics":
   - LLM Port: 5002
   - Temperature: 0.5
   - Response Length: 2000
   - Add the "Follow-up Analysis" block

### Step 3: Create a Workflow

Create a workflow named "AI Ethics Analysis":
1. Add the "initial_analysis" payload
2. Add the "detailed_ethics" payload

### Step 4: Execute

Run the workflow and view the results in the Runs/Responses tab.

## Troubleshooting

### Common Issues

- **LLM Connection Failures**: Ensure your LLM instances are running on the specified ports.
- **WebSocket Disconnects**: Check your network connection and try refreshing the page.
- **Database Errors**: Make sure the `data` directory is writable.

### Logs

Check the console output for detailed logs about:
- Server startup
- Database operations
- LLM interactions
- Workflow execution

### Getting Help

If you encounter issues:
1. Check the documentation in the `docs` directory
2. Look for error messages in the console
3. Ensure all dependencies are installed correctly
