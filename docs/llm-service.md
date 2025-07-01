# LLM Service Documentation

The LLM Service is the core component responsible for managing communication with different LLM (Large Language Model) instances in the Orchestration system.

## Overview

The LLM Service is implemented as a singleton in `services/llm.js` and handles:

- Registration and tracking of LLM instances
- Communication with different LLM APIs (Kobold, OpenAI-compatible)
- Prompt formatting for different model types
- Response processing and error recovery
- Retry logic and timeout management

## LLM Instance Management

### Registering Instances

LLM instances are identified by the port they run on and can be registered with:

```javascript
llmService.registerInstance(port, name, defaultConfig);
```

Parameters:
- `port`: The port number where the LLM API is accessible
- `name`: A friendly name for the instance
- `defaultConfig`: Default configuration values for this instance

Example:
```javascript
llmService.registerInstance(5001, 'Mistral 7B', {
  temperature: 0.7,
  max_length: 1000,
  model_format: 'mistral'
});
```

### Checking Instance Availability

To verify if an LLM instance is running and available:

```javascript
const isAvailable = await llmService.checkInstanceAvailability(port);
```

### Getting Instance Information

To get information about registered instances:

```javascript
// Get all instances
const allInstances = llmService.getInstances();

// Get a specific instance
const instance = llmService.getInstance(port);
```

## Sending Prompts to LLMs

### Basic Usage

```javascript
const response = await llmService.sendPrompt(port, prompt, config);
```

Parameters:
- `port`: The port number of the LLM instance
- `prompt`: The text prompt to send
- `config`: Configuration options for this specific request

Example:
```javascript
const response = await llmService.sendPrompt(5001, "Explain quantum computing", {
  temperature: 0.5,
  max_length: 2000,
  model_format: 'mistral'
});
```

### Response Processing

The raw response from the LLM needs to be processed:

```javascript
const processed = llmService.processResponse(response);
console.log(processed.text); // The generated text
console.log(processed.metadata); // Metadata like token counts
```

## Supported Model Formats

The service supports formatting prompts for different model types:

### Mistral Format

Used for Mistral-based models, implements the chat completions API.

```javascript
const config = {
  model_format: 'mistral',
  temperature: 0.7,
  max_length: 1000
};
```

### Llama Instruction Format

Used for Llama-based models using the instruction format.

```javascript
const config = {
  model_format: 'llama',
  temperature: 0.6,
  max_length: 1500
};
```

### Llama Chat Format

Used for Llama models with a chat-oriented format.

```javascript
const config = {
  model_format: 'llama_chat',
  temperature: 0.6,
  max_length: 1500
};
```

### Command-R Format

Used for Cohere Command-R compatible models.

```javascript
const config = {
  model_format: 'command-r',
  temperature: 0.7,
  max_length: 1000
};
```

### Default Format

Simple prompt without special formatting.

```javascript
const config = {
  model_format: 'default',
  temperature: 0.7,
  max_length: 1000
};
```

## Error Handling

The service implements several error handling mechanisms:

### Retry Logic

Requests that fail will be retried automatically:

```javascript
const config = {
  retries: 3, // Number of retry attempts
  timeout: 120000 // Timeout in milliseconds
};
```

### Corrupted Text Cleaning

The service can clean corrupted or binary text that sometimes appears in LLM responses:

```javascript
const cleanedText = llmService.cleanCorruptedText(corruptedResponse);
```

## API Fallback Mechanism

The service tries multiple API endpoints to find one that works:

1. First tries the appropriate API for the model format (e.g., chat completions API for Mistral)
2. Falls back to Kobold API 
3. Finally tries OpenAI-compatible API

This ensures maximum compatibility with different LLM backends.
