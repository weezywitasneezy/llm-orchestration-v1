/**
 * LLM Orchestration Application
 * Schema Validation Rules
 * 
 * AI-CONTEXT: This module provides schema validation rules for use with the
 * validation utilities. These schemas can be used to validate input data
 * throughout the application.
 */

const SCHEMAS = {
    // Blocks schema
    block: {
        title: {
            required: true,
            type: 'string',
            validate: value => ({
                isValid: value && value.length > 0 && value.length <= 255,
                error: 'Title must be between 1 and 255 characters'
            })
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
    },
    
    // Payloads schema
    payload: {
        name: {
            required: true,
            type: 'string',
            validate: value => ({
                isValid: value && value.length > 0 && value.length <= 255,
                error: 'Name must be between 1 and 255 characters'
            })
        },
        temperature: {
            type: 'number',
            validate: value => ({
                isValid: value >= 0 && value <= 1,
                error: 'Temperature must be between 0 and 1'
            })
        },
        response_length: {
            type: 'number',
            validate: value => ({
                isValid: value > 0 && Number.isInteger(value),
                error: 'Response length must be a positive integer'
            })
        },
        llm_port: {
            type: 'number',
            validate: value => ({
                isValid: value > 0 && value <= 65535 && Number.isInteger(value),
                error: 'LLM port must be a valid port number (1-65535)'
            })
        },
        model_format: {
            type: 'string',
            validate: value => ({
                isValid: ['default', 'mistral', 'llama', 'llama_chat', 'command-r'].includes(value),
                error: 'Model format must be one of: default, mistral, llama, llama_chat, command-r'
            })
        },
        blocks: {
            type: 'array'
        }
    },
    
    // Payload blocks schema
    payloadBlock: {
        payload_id: {
            required: true,
            type: 'number',
            validate: value => ({
                isValid: value > 0 && Number.isInteger(value),
                error: 'Payload ID must be a positive integer'
            })
        },
        block_id: {
            required: true,
            type: 'number',
            validate: value => ({
                isValid: value > 0 && Number.isInteger(value),
                error: 'Block ID must be a positive integer'
            })
        },
        order_index: {
            required: true,
            type: 'number',
            validate: value => ({
                isValid: value >= 0 && Number.isInteger(value),
                error: 'Order index must be a non-negative integer'
            })
        }
    },
    
    // Workflows schema
    workflow: {
        name: {
            required: true,
            type: 'string',
            validate: value => ({
                isValid: value && value.length > 0 && value.length <= 255,
                error: 'Name must be between 1 and 255 characters'
            })
        },
        payloads: {
            type: 'array'
        }
    },
    
    // Workflow payloads schema
    workflowPayload: {
        workflow_id: {
            required: true,
            type: 'number',
            validate: value => ({
                isValid: value > 0 && Number.isInteger(value),
                error: 'Workflow ID must be a positive integer'
            })
        },
        payload_id: {
            required: true,
            type: 'number',
            validate: value => ({
                isValid: value > 0 && Number.isInteger(value),
                error: 'Payload ID must be a positive integer'
            })
        },
        order_index: {
            required: true,
            type: 'number',
            validate: value => ({
                isValid: value >= 0 && Number.isInteger(value),
                error: 'Order index must be a non-negative integer'
            })
        }
    },
    
    // Runs schema
    run: {
        workflow_id: {
            required: true,
            type: 'number',
            validate: value => ({
                isValid: value > 0 && Number.isInteger(value),
                error: 'Workflow ID must be a positive integer'
            })
        },
        status: {
            required: true,
            type: 'string',
            validate: value => ({
                isValid: ['running', 'completed', 'failed', 'IN_PROGRESS'].includes(value),
                error: 'Status must be one of: running, completed, failed, IN_PROGRESS'
            })
        },
        metadata: {
            type: 'string'
        }
    },
    
    // Responses schema
    response: {
        run_id: {
            required: true,
            type: 'number',
            validate: value => ({
                isValid: value > 0 && Number.isInteger(value),
                error: 'Run ID must be a positive integer'
            })
        },
        payload_id: {
            type: 'number',
            validate: value => ({
                isValid: value > 0 && Number.isInteger(value),
                error: 'Payload ID must be a positive integer'
            })
        },
        content: {
            type: 'string'
        },
        metadata: {
            type: 'string'
        }
    }
};

/**
 * Get a validation schema by name
 * @param {string} schemaName - Name of the schema to retrieve
 * @returns {Object} - The validation schema or null if not found
 */
function getSchema(schemaName) {
    return SCHEMAS[schemaName] || null;
}

// Export the schemas and helper function
module.exports = {
    schemas: SCHEMAS,
    getSchema
};
