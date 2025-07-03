/**
 * LLM Orchestration Application
 * LLM Communication Service
 * 
 * This module handles communication with LLM instances running on different ports
 * via kobold.cpp or similar backends.
 * 
 * AI-CONTEXT: This is a core service that follows the singleton pattern used throughout
 * the application. It manages all communication with LLM instances and implements
 * fallback strategies to maximize compatibility with different LLM backends.
 */

const http = require('http');
const https = require('https');

/**
 * LLM Service class for managing communication with LLM instances
 * 
 * AI-CONTEXT: The service maintains a registry of LLM instances by port number,
 * tracks their status, and provides methods for interacting with them.
 * Error handling is implemented at each level with descriptive error messages.
 */
class LLMService {
    constructor() {
        // Map to track active LLM ports and their status
        this.llmInstances = new Map();
        
        // Default host (host.docker.internal for Docker compatibility)
        this.defaultHost = process.env.LLM_HOST || 'host.docker.internal';
        
        // Default LLM configuration
        this.defaultConfig = {
            temperature: 0.7,
            max_length: 1000,
            top_p: 0.9,
            top_k: 40,
            stream: false
        };
    }
    
    /**
     * Register an LLM instance running on a specific port
     * @param {number} port - The port number where the LLM is running
     * @param {string} name - A friendly name for the LLM instance
     * @param {Object} defaultConfig - Default configuration for this LLM instance
     */
    registerInstance(port, name, defaultConfig = {}) {
        this.llmInstances.set(port, {
            port,
            name,
            status: 'unknown',
            lastUsed: null,
            config: { ...this.defaultConfig, ...defaultConfig }
        });
        
        // Check if the instance is available
        this.checkInstanceAvailability(port);
    }
    
    /**
     * Check connectivity and get model information from an LLM endpoint
     * @param {number} port - The port number to check
     * @returns {Promise<Object>} - Promise resolving to connectivity status and model info
     * 
     * AI-CONTEXT: This method is used for health checks and to gather information 
     * about LLM instances. It returns a standardized response format regardless of
     * the underlying LLM API.
     */
    async testConnectivity(port) {
        try {
            // First check if the port is reachable
            const modelInfo = await this.getModelInfo(port);
            return {
                connected: true,
                modelInfo,
                timestamp: new Date()
            };
        } catch (error) {
            console.error(`Error testing connectivity to port ${port}:`, error);
            return {
                connected: false,
                error: error.message || 'Unknown error',
                timestamp: new Date()
            };
        }
    }
    
    /**
     * Get detailed information about the LLM endpoint including supported APIs and model details
     * @param {number} port - The port number to check
     * @returns {Promise<Object>} - Promise with expanded connectivity information
     * 
     * AI-CONTEXT: This method tests multiple API endpoints to determine which ones
     * are supported by the LLM instance. It's used for compatibility detection.
     */
    async getDetailedConnectivity(port) {
        const result = {
            port,
            timestamp: new Date(),
            connected: false,
            koboldApiAvailable: false,
            openAiApiAvailable: false,
            modelInfo: null,
            apiDetails: {},
            endpointInfo: {}
        };
        
        try {
            // Test Kobold API
            try {
                const koboldModelInfo = await this.makeRequest(port, '/api/v1/model', 'GET');
                result.koboldApiAvailable = true;
                result.connected = true;
                result.modelInfo = koboldModelInfo;
                result.apiDetails.kobold = koboldModelInfo;
            } catch (koboldError) {
                result.apiDetails.koboldError = koboldError.message;
            }
            
            // Test OpenAI compatible API
            try {
                const openAiInfo = await this.makeRequest(port, '/v1/models', 'GET');
                result.openAiApiAvailable = true;
                result.connected = true;
                if (!result.modelInfo) {
                    result.modelInfo = openAiInfo;
                }
                result.apiDetails.openai = openAiInfo;
            } catch (openAiError) {
                result.apiDetails.openaiError = openAiError.message;
            }
            
            // Try to get additional information about the endpoint
            if (result.connected) {
                try {
                    // Check if the info endpoint exists (some implementations provide this)
                    const infoResponse = await this.makeRequest(port, '/info', 'GET');
                    result.endpointInfo.info = infoResponse;
                } catch (infoError) {
                    // Info endpoint not available, which is fine
                }
            }
            
            return result;
        } catch (error) {
            console.error(`Error getting detailed connectivity info for port ${port}:`, error);
            result.error = error.message;
            return result;
        }
    }
    
    /**
     * Get model information from an LLM endpoint
     * @param {number} port - The port number
     * @returns {Promise<Object>} - Promise resolving to model information
     * 
     * AI-CONTEXT: This method implements a fallback strategy for getting model information,
     * trying multiple API endpoints in sequence until one succeeds.
     */
    async getModelInfo(port) {
        // Try the Kobold API model info endpoint
        try {
            // Try the model info endpoint for Kobold API
            const modelInfo = await this.makeRequest(port, '/api/v1/model', 'GET');
            return modelInfo;
        } catch (koboldError) {
            console.log(`Could not get model info via Kobold API: ${koboldError.message}`);
            
            // Try the OpenAI compatible API as fallback
            try {
                const openAiInfo = await this.makeRequest(port, '/v1/models', 'GET');
                return openAiInfo;
            } catch (openAiError) {
                console.log(`Could not get model info via OpenAI API: ${openAiError.message}`);
                
                // If both fail, return basic info that a server is running
                // but we couldn't get detailed model information
                return {
                    success: false,
                    message: 'Server reachable but could not get model information',
                    port
                };
            }
        }
    }
    
    /**
     * Check if an LLM instance is available
     * @param {number} port - The port number to check
     * @returns {Promise<boolean>} - Promise resolving to availability status
     * 
     * AI-CONTEXT: This method handles both real and simulated LLM instances based on
     * environment variables. In development, it can simulate availability without
     * actual LLM instances running.
     */
    async checkInstanceAvailability(port) {
        if (!this.llmInstances.has(port)) {
            return false;
        }
        
        try {
            // For development, just return true for simulated availability
            // In production environment, use real connection checks
            if (process.env.NODE_ENV === 'development' || process.env.SIMULATE_LLM === 'true') {
                console.log(`Using simulated availability status for LLM on port ${port}`);
                return process.env.SIMULATE_LLM_AVAILABLE !== 'false'; // Default to available
            }
            
            // Attempt to connect to the health endpoint
            const response = await this.makeRequest(port, '/health', 'GET');
            const available = response && response.status === 'ok';
            
            // Update status in the instances map
            const instance = this.llmInstances.get(port);
            instance.status = available ? 'available' : 'unavailable';
            this.llmInstances.set(port, instance);
            
            return available;
        } catch (error) {
            // Update status on error
            const instance = this.llmInstances.get(port);
            instance.status = 'unavailable';
            this.llmInstances.set(port, instance);
            
            return false;
        }
    }
    
    /**
     * Get all registered LLM instances
     * @returns {Array} - Array of LLM instance objects
     */
    getInstances() {
        return Array.from(this.llmInstances.values());
    }
    
    /**
     * Get a specific LLM instance by port
     * @param {number} port - The port number
     * @returns {Object|null} - The LLM instance or null if not found
     */
    getInstance(port) {
        return this.llmInstances.get(port) || null;
    }
    
    /**
     * Send a prompt to an LLM instance
     * @param {number} port - The port where the LLM is running
     * @param {string} prompt - The prompt text to send
     * @param {Object} config - Configuration options for the LLM
     * @returns {Promise<Object>} - Promise resolving to the LLM response
     * 
     * AI-CONTEXT: This is the core method for sending prompts to LLMs. It implements:
     * 1. Retry logic for handling transient failures
     * 2. Model format selection for different LLM types
     * 3. API fallback strategy to maximize compatibility
     * 4. Extensive error handling with specific error messages
     * 
     * AI-CAUTION: Modifications to this method could impact all LLM interactions
     * in the application. Test thoroughly after changes.
     */
    async sendPrompt(port, prompt, config = {}) {
        if (!this.llmInstances.has(port)) {
            throw new Error(`No LLM instance registered on port ${port}`);
        }
        
        const instance = this.llmInstances.get(port);
        const mergedConfig = { ...instance.config, ...config };
        
        // Update last used timestamp
        instance.lastUsed = new Date();
        this.llmInstances.set(port, instance);
        
        // Set retries and timeout
        const maxRetries = config.retries || 2; // Default to 2 retries
        const retryDelayMs = 2000; // 2 seconds between retries
        let lastError = null;
        
        // Format the prompt based on the model format
        const modelFormat = config.model_format || 'default';
        const formattedPrompt = this.formatPromptForModel(prompt, modelFormat);
        console.log(`[LLM] Using model format: ${modelFormat}`);
        
        // Try multiple times if needed
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // If this isn't the first attempt, log that we're retrying
                if (attempt > 0) {
                    console.log(`Retry attempt ${attempt}/${maxRetries} for prompt to LLM on port ${port}`);
                    // Add a small delay before retrying
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                }
                
                // If using a chat-based format (Mistral), try that first
                if (modelFormat === 'mistral') {
                    try {
                        console.log('[LLM] Using chat completions API for Mistral format');
                        
                        const payload = {
                            model: config.model || "local-model",
                            messages: [
                                { role: "user", content: formattedPrompt }
                            ],
                            max_tokens: mergedConfig.max_length,
                            temperature: mergedConfig.temperature,
                            top_p: mergedConfig.top_p,
                            stream: mergedConfig.stream || false
                        };
                        
                        const response = await this.makeRequest(port, '/v1/chat/completions', 'POST', payload, {
                            timeout: mergedConfig.timeout || 180000 // 3 minutes timeout for generation
                        });
                        
                        return response;
                    } catch (chatError) {
                        console.log(`Failed to use chat completions API: ${chatError.message}. Trying other APIs...`);
                    }
                }
                
                /* AI-EXTENSION-POINT: Add new model formats here by adding new conditions
                   for different model types. Follow the pattern of the existing conditions,
                   with appropriate API endpoint selections and payload structures. */
                
                // If using Command-R format, use a format compatible with Command-R models
                if (modelFormat === 'command-r') {
                    try {
                        console.log('[LLM] Using Command-R compatible format');
                        
                        // Command-R specific payload structure
                        const payload = {
                            prompt: formattedPrompt,
                            model: config.model || "command-r", 
                            max_tokens: mergedConfig.max_length,
                            temperature: mergedConfig.temperature,
                            stop_sequences: config.stop_sequences || [],
                            return_likelihoods: "NONE",
                            stream: mergedConfig.stream || false,
                            truncate: "END",
                            presence_penalty: 0.0,
                            frequency_penalty: 0.0
                        };
                        
                        // Try different Command-R API endpoints
                        try {
                            // Try regular kobold endpoint first
                            console.log('[LLM] Trying standard Kobold endpoint for Command-R model');
                            const koboldPayload = {
                                prompt: formattedPrompt,
                                max_length: mergedConfig.max_length,
                                temperature: mergedConfig.temperature,
                                top_p: mergedConfig.top_p || 0.9,
                                top_k: mergedConfig.top_k || 40,
                                tfs: mergedConfig.tfs || 1.0,
                                typical: mergedConfig.typical || 1.0,
                                rep_pen: mergedConfig.rep_pen || 1.1,
                                rep_pen_range: mergedConfig.rep_pen_range || 1024,
                                rep_pen_slope: mergedConfig.rep_pen_slope || 0.7,
                                sampler_order: mergedConfig.sampler_order || [6, 0, 1, 3, 4, 2, 5],
                                seed: mergedConfig.seed || -1,
                                quiet: false
                            };
                            
                            const response = await this.makeRequest(port, '/api/v1/generate', 'POST', koboldPayload, {
                                timeout: mergedConfig.timeout || 180000
                            });
                            return response;
                        } catch (koboldError) {
                            console.log(`Failed with Kobold endpoint: ${koboldError.message}. Trying Command-R endpoints...`);
                            
                            try {
                                // Try /v1/generate endpoint (Cohere style)
                                const response = await this.makeRequest(port, '/v1/generate', 'POST', payload, {
                                    timeout: mergedConfig.timeout || 180000
                                });
                                return response;
                            } catch (endpointError) {
                                console.log(`Failed with /v1/generate endpoint: ${endpointError.message}. Trying alternative...`);
                                
                                // Try simple /generate endpoint
                                const response = await this.makeRequest(port, '/generate', 'POST', payload, {
                                    timeout: mergedConfig.timeout || 180000
                                });
                                return response;
                            }
                        }
                    } catch (commandRError) {
                        console.log(`Failed to use Command-R APIs: ${commandRError.message}. Trying other APIs...`);
                    }
                }
                
                // First try the Kobold API
                try {
                    const payload = {
                        prompt: formattedPrompt, // Using formatted prompt
                        max_length: mergedConfig.max_length,
                        temperature: mergedConfig.temperature,
                        top_p: mergedConfig.top_p,
                        top_k: mergedConfig.top_k,
                        stream: mergedConfig.stream || false
                    };
                    
                    const response = await this.makeRequest(port, '/api/v1/generate', 'POST', payload, {
                        timeout: mergedConfig.timeout || 180000 // 3 minutes timeout for generation
                    });
                    
                    return response;
                } catch (koboldError) {
                    console.log(`Failed to use Kobold API: ${koboldError.message}. Trying OpenAI-compatible API...`);
                    
                    // Fall back to OpenAI-compatible API
                    const payload = {
                        model: "local-model",
                        prompt: formattedPrompt, // Using formatted prompt
                        max_tokens: mergedConfig.max_length,
                        temperature: mergedConfig.temperature,
                        top_p: mergedConfig.top_p,
                        stream: mergedConfig.stream || false
                    };
                    
                    const response = await this.makeRequest(port, '/v1/completions', 'POST', payload, {
                        timeout: mergedConfig.timeout || 180000 // 3 minutes timeout for generation
                    });
                    
                    return response;
                }
            } catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt + 1}/${maxRetries + 1} failed for prompt to LLM on port ${port}:`, error.message);
                // If this was the last retry, throw the error
                if (attempt === maxRetries) {
                    throw error;
                }
                // Otherwise we'll retry in the next loop iteration
            }
        }
        
        // This should never be reached due to the throw in the loop above
        throw lastError || new Error(`Failed to send prompt to LLM on port ${port} after ${maxRetries + 1} attempts`);
    }
    
    /**
     * Process the raw response from an LLM instance
     * @param {Object} response - The raw response from the LLM
     * @returns {Object} Processed response with text and metadata
     * 
     * AI-CONTEXT: This method normalizes responses from different LLM API formats
     * into a standard structure with text content and metadata. It handles various
     * response formats from different LLM backends.
     */
    processResponse(response) {
        if (!response || typeof response !== 'object') {
            throw new Error('Invalid LLM response format');
        }

        console.log('[LLM] Raw response:', response);

        // Handle both Kobold and OpenAI-compatible API responses
        let text, metadata;
        
        /* AI-EXTENSION-POINT: To support new API response formats, add new conditions
           below to handle the specific format structure. Extract the generated text
           and any relevant metadata like token counts. */
        
        if (response.results && response.results[0]) {
            // Kobold API format
            text = response.results[0].text || '';
            text = this.cleanCorruptedText(text);
            
            metadata = {
                tokens: response.results[0].prompt_tokens + response.results[0].completion_tokens,
                promptTokens: response.results[0].prompt_tokens || 0,
                completionTokens: response.results[0].completion_tokens || 0,
                finishReason: response.results[0].finish_reason || 'unknown'
            };
        } else if (response.generations && response.generations.length > 0) {
            // Command-R format
            console.log('[LLM] Detected Command-R API response');
            text = response.generations[0].text || '';
            text = this.cleanCorruptedText(text);
            metadata = {
                tokens: response.meta?.billed_units?.input_tokens + response.meta?.billed_units?.output_tokens || 0,
                promptTokens: response.meta?.billed_units?.input_tokens || 0,
                completionTokens: response.meta?.billed_units?.output_tokens || 0,
                finishReason: response.generations[0].finish_reason || 'unknown',
                responseType: 'command-r'
            };
        } else if (response.choices && response.choices[0] && response.choices[0].message) {
            // OpenAI chat completions API format
            console.log('[LLM] Detected chat completions API response');
            text = response.choices[0].message.content || '';
            text = this.cleanCorruptedText(text);
            metadata = {
                tokens: response.usage?.total_tokens || 0,
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                finishReason: response.choices[0].finish_reason || 'unknown',
                responseType: 'chat'
            };
        } else if (response.choices && response.choices[0]) {
            // OpenAI-compatible API format (completions)
            text = response.choices[0].text || '';
            text = this.cleanCorruptedText(text);
            metadata = {
                tokens: response.usage?.total_tokens || 0,
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                finishReason: response.choices[0].finish_reason || 'unknown',
                responseType: 'completion'
            };
        } else if (response.result) {
            // Direct result format
            text = response.result;
            metadata = {
                tokens: response.tokens || 0,
                promptTokens: response.prompt_tokens || 0,
                completionTokens: response.completion_tokens || 0,
                finishReason: response.finish_reason || 'unknown'
            };
        } else {
            console.error('[LLM] Unsupported response format:', response);
            throw new Error('Unsupported LLM response format');
        }

        console.log('[LLM] Processed response:', { text, metadata });
        return { text, metadata };
    }
    
    /**
     * Format a prompt based on the selected model format
     * @param {string} prompt - The raw prompt text
     * @param {string} modelFormat - The model format to use (mistral, llama, etc.)
     * @returns {string} - The formatted prompt
     * 
     * AI-EXTENSION-POINT: To add support for a new model format, add a new case
     * in the switch statement below. Each format should transform the raw prompt
     * into the appropriate structure for that specific model.
     */
    formatPromptForModel(prompt, modelFormat) {
        switch (modelFormat) {
            case 'mistral':
                // Mistral models typically work well with chat format, but can also use this format
                return prompt; // No additional formatting needed as we'll use the chat format
                
            case 'llama':
                // Llama instruction format
                return `<s>[INST] ${prompt} [/INST]`;
                
            case 'llama_chat':
                // Llama chat format variant
                return `<s>[INST] <<SYS>>\nYou are a helpful assistant.\n<</SYS>>\n\n${prompt} [/INST]`;
                
            case 'command-r':
                // Command-R (Cohere Command-R) format
                return prompt; // No special formatting for the prompt itself, we'll use the chat format with different API structure
                
            case 'default':
            default:
                return prompt; // No special formatting
        }
    }

    /**
     * Clean corrupted or binary text output
     * @param {string} text - The text to clean
     * @returns {string} - Cleaned text or error message
     * 
     * AI-CONTEXT: This utility method helps recover from corrupted LLM outputs,
     * which can happen with some models. It detects and cleans various corruption
     * patterns to recover usable text when possible.
     */
    cleanCorruptedText(text) {
        if (!text) return '';
        
        // First, check if the text appears to be corrupted
        const isCorrupted = 
            text.includes('[UNK_BYTE') || 
            text.includes('UNK_BYTE') || 
            (text.length > 0 && text.split('').filter(c => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\t').length > text.length * 0.1);
            
        if (!isCorrupted) return text;
        
        console.log('[LLM] Cleaning corrupted text response');
        
        try {
            // Remove UNK_BYTE patterns
            let cleanedText = text.replace(/\[UNK_BYTE_[^\]]*\]/g, ' ');
            cleanedText = cleanedText.replace(/UNK_BYTE_[^\s]*/g, ' ');
            
            // Remove non-printable characters except newlines and tabs
            cleanedText = cleanedText.replace(/[^\x20-\x7E\n\t]/g, ' ');
            
            // Remove excessive spacing
            cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
            
            // If we still have some text, return it
            if (cleanedText.length > 3) {
                console.log('[LLM] Successfully cleaned corrupted text');
                return cleanedText;
            }
        } catch (error) {
            console.error('[LLM] Error cleaning corrupted text:', error);
        }
        
        // If cleaning failed, or resulted in empty text, return error message
        return "[Error: The model returned corrupted or binary data. Please try different model settings or a different model format.]";
    }
    
    /**
     * Make an HTTP request to an LLM API endpoint
     * @param {number} port - The port to connect to
     * @param {string} path - The API endpoint path
     * @param {string} method - The HTTP method (GET, POST, etc.)
     * @param {Object} data - The request data for POST requests
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} - Promise resolving to the response data
     * 
     * AI-CONTEXT: This is a low-level utility method that handles HTTP communication
     * with LLM instances. It implements appropriate timeouts, error handling, and
     * response parsing. This pattern is used for all HTTP requests in the application.
     */
    async makeRequest(port, path, method = 'GET', data = null, options = {}) {
        return new Promise((resolve, reject) => {
            // Set appropriate timeout based on request type
            // Generation requests need longer timeouts than info/health checks
            const isGenerationRequest = (
                path.includes('/generate') || 
                path.includes('/completions') || 
                path.includes('/chat')
            );
            
            const timeout = isGenerationRequest 
                ? (options.timeout || 120000) // 2 minutes for generation requests
                : (options.timeout || 30000);  // 30 seconds for other requests
            
            const requestOptions = {
                hostname: this.defaultHost,
                port: port,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                timeout: timeout
            };
            
            console.log(`Making ${method} request to ${this.defaultHost}:${port}${path} (timeout: ${timeout}ms)`);
            
            const request = http.request(requestOptions, (response) => {
                let responseData = '';
                
                response.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                response.on('end', () => {
                    try {
                        if (responseData.trim() === '') {
                            // Handle empty responses
                            resolve({});
                            return;
                        }
                        
                        const parsedData = JSON.parse(responseData);
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            resolve(parsedData);
                        } else {
                            reject(new Error(parsedData.message || `HTTP Error: ${response.statusCode}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });
            
            request.on('error', (error) => {
                const errorMsg = `Connection error to ${this.defaultHost}:${port}${path}: ${error.message}`;
                console.error(errorMsg);
                reject(new Error(errorMsg));
            });
            
            request.on('timeout', () => {
                const timeoutMsg = `Request timed out after ${timeout}ms when connecting to ${this.defaultHost}:${port}${path}`;
                console.error(timeoutMsg);
                request.destroy();
                reject(new Error(timeoutMsg));
            });
            
            if (data && (method === 'POST' || method === 'PUT')) {
                try {
                    const dataStr = JSON.stringify(data);
                    request.write(dataStr);
                } catch (error) {
                    reject(new Error(`Error serializing request data: ${error.message}`));
                    return;
                }
            }
            
            request.end();
        });
    }
}

/* AI-CONTEXT: This creates a singleton instance of the LLM service.
   Throughout the application, this single instance is imported and used,
   ensuring consistent state and avoiding duplicate connections. */
const llmService = new LLMService();

// Export the service
module.exports = llmService;