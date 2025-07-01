/**
 * LLM Orchestration Application
 * Execution routes for workflow execution
 * 
 * AI-CONTEXT: This module is responsible for the core workflow execution logic,
 * handling the sequential processing of payloads, variable substitution, LLM
 * interactions, and real-time WebSocket updates. It serves as the orchestration
 * layer of the application.
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const llmService = require('../services/init-llm');

// Broadcast function for WebSocket updates
let broadcast = null;

/**
 * Sets the WebSocket broadcast function
 * 
 * AI-CONTEXT: This injection pattern allows the server.js file to provide the
 * WebSocket broadcast functionality to this module without creating a circular
 * dependency. This is a common pattern used across route handlers for real-time updates.
 */
router.setBroadcast = (broadcastFn) => {
    broadcast = broadcastFn;
};

/**
 * Replace variables in a prompt with values from context
 * 
 * AI-CONTEXT: This function implements the variable substitution system that allows
 * workflows to reference outputs from previous payloads. It uses the {{variable}}
 * syntax to identify variables that should be replaced with context values.
 * 
 * @param {string} prompt - The prompt text with potential variables
 * @param {Object} context - The execution context containing previous responses
 * @returns {string} - The processed prompt with variables replaced
 */
function replaceVariables(prompt, context) {
    console.log('[Context] Current context:', context);
    
    // First try to replace variables in the format {{variable}}
    let processedPrompt = prompt.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
        // Try to find the variable in previous responses
        for (const response of context.responses) {
            if (response.payloadName === variable) {
                console.log(`[Context] Replacing variable ${variable} with response from ${response.payloadName}`);
                return response.content;
            }
        }
        // If not found, return the original match
        console.log(`[Context] Variable ${variable} not found in context`);
        return match;
    });
    
    /* AI-EXTENSION-POINT: You can add additional variable substitution patterns here,
       such as supporting different variable formats or adding lookup from other sources.
       Make sure to maintain the existing behavior for backward compatibility. */
    
    // If no variables were replaced and there are previous responses,
    // append the last response to the prompt
    if (processedPrompt === prompt && context.responses.length > 0) {
        const lastResponse = context.responses[context.responses.length - 1];
        console.log(`[Context] Appending last response from ${lastResponse.payloadName}`);
        processedPrompt = `${processedPrompt}\n\nPrevious response:\n${lastResponse.content}`;
    }
    
    return processedPrompt;
}

/**
 * Execute a workflow - this handles the actual LLM interactions
 * 
 * AI-CONTEXT: This endpoint starts workflow execution and returns immediately,
 * while the actual processing happens asynchronously. This is a common pattern for
 * long-running operations in the application.
 */
router.post('/', async (req, res) => {
    const { workflowId } = req.body;
    
    if (!workflowId) {
        return res.status(400).json({ error: 'Workflow ID is required' });
    }
    
    try {
        // Get the workflow
        const workflow = await db.get('SELECT * FROM workflows WHERE id = ?', [workflowId]);
        
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        
        // Get payloads for the workflow
        const payloads = await db.all(`
            SELECT p.* FROM payloads p
            JOIN workflow_payloads wp ON p.id = wp.payload_id
            WHERE wp.workflow_id = ?
            ORDER BY wp.order_index
        `, [workflowId]);
        
        if (payloads.length === 0) {
            return res.status(400).json({ error: 'Workflow has no payloads to execute' });
        }
        
        // Create a run record
        const runResult = await db.run(`
            INSERT INTO runs (workflow_id, status, metadata)
            VALUES (?, 'running', ?)
        `, [workflowId, JSON.stringify({
            workflow_name: workflow.name,
            total_payloads: payloads.length,
            started_at: new Date().toISOString()
        })]);
        
        const runId = runResult.lastID;
        
        // Start execution in the background
        executeWorkflowAsync(workflowId, runId, payloads);
        
        // Return immediately with the run ID
        res.json({
            runId,
            message: 'Workflow execution started',
            status: 'running'
        });
        
    } catch (error) {
        console.error('Error starting workflow execution:', error);
        res.status(500).json({ error: 'Failed to start workflow execution' });
    }
});

/**
 * Get the status and results of a run
 * 
 * AI-CONTEXT: This endpoint allows clients to poll for the status of workflow execution.
 * It's used alongside WebSockets to provide a complete real-time and polling-based 
 * monitoring solution.
 */
router.get('/run/:id', async (req, res) => {
    try {
        // Get run by ID
        const run = await db.get('SELECT * FROM runs WHERE id = ?', [req.params.id]);
        
        if (!run) {
            return res.status(404).json({ error: 'Run not found' });
        }
        
        // Get responses for this run
        const responses = await db.all('SELECT * FROM responses WHERE run_id = ? ORDER BY created_at', [req.params.id]);
        
        run.responses = responses;
        
        res.json(run);
    } catch (error) {
        console.error('Error fetching run:', error);
        res.status(500).json({ error: 'Failed to fetch run: ' + error.message });
    }
});

/**
 * Execute a workflow by ID (alternative endpoint)
 * 
 * AI-CONTEXT: This is an alternative endpoint for workflow execution that uses
 * path parameters instead of request body. Both endpoints lead to the same 
 * async execution process.
 */
router.post('/workflow/:id', async (req, res) => {
    const workflowId = req.params.id;
    
    if (!workflowId) {
        return res.status(400).json({ error: 'Workflow ID is required' });
    }
    
    try {
        // Get the workflow
        const workflow = await db.get('SELECT * FROM workflows WHERE id = ?', [workflowId]);
        
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        
        // Get payloads for the workflow
        const payloads = await db.all(`
            SELECT p.* FROM payloads p
            JOIN workflow_payloads wp ON p.id = wp.payload_id
            WHERE wp.workflow_id = ?
            ORDER BY wp.order_index
        `, [workflowId]);
        
        if (payloads.length === 0) {
            return res.status(400).json({ error: 'Workflow has no payloads to execute' });
        }
        
        // Create a run record
        const runResult = await db.run(
            'INSERT INTO runs (workflow_id, status) VALUES (?, ?)',
            [workflowId, 'IN_PROGRESS']
        );
        
        const runId = runResult.lastID;
        
        // Send initial response before executing the workflow
        res.status(202).json({
            message: 'Workflow execution started',
            runId
        });
        
        // Execute payloads sequentially in a separate process
        executeWorkflowAsync(workflowId, runId, payloads);
        
    } catch (error) {
        console.error('Error starting workflow execution:', error);
        res.status(500).json({ error: 'Failed to start workflow execution: ' + error.message });
    }
});

/**
 * Asynchronously execute a workflow
 * 
 * AI-CONTEXT: This is the core function that handles the actual workflow execution.
 * It processes each payload in sequence, maintaining context between them, and
 * broadcasts real-time updates via WebSockets. The function implements the core
 * business logic of the application.
 * 
 * AI-CAUTION: This function is critical to the application's functionality. Changes
 * should be carefully tested as they could affect all workflow executions.
 * 
 * @param {number} workflowId - The ID of the workflow to execute
 * @param {number} runId - The ID of the run record
 * @param {Array} payloads - The array of payloads to process
 */
async function executeWorkflowAsync(workflowId, runId, payloads) {
    const context = {
        responses: [],
        variables: {}
    };
    
    try {
        for (let i = 0; i < payloads.length; i++) {
            const payload = payloads[i];
            
            // Broadcast progress
            if (broadcast) {
                broadcast({
                    type: 'execution_progress',
                    data: {
                        runId,
                        payloadId: payload.id,
                        payloadName: payload.name,
                        status: 'running',
                        progress: (i / payloads.length) * 100,
                        metadata: {
                            tokens_per_second: 0 // Will be updated after response
                        }
                    }
                });
            }
            
            // Get blocks for this payload
            const blocks = await db.all(`
                SELECT b.* FROM blocks b
                JOIN payload_blocks pb ON b.id = pb.block_id
                WHERE pb.payload_id = ?
                ORDER BY pb.order_index
            `, [payload.id]);
            
            /* AI-CONTEXT: Block processing is a core feature that allows combining multiple
               text blocks into a single prompt. Special 'response' blocks can reference
               responses from previous payloads, creating a chain of dependencies. */
            
            // Process blocks and handle response blocks
            let processedBlocks = [];
            for (const block of blocks) {
                if (block.tags && block.tags.includes('response')) {
                    // This is a response block, try to find its source payload
                    const payloadMatch = block.tags.match(/payload_(\d+)/);
                    if (payloadMatch) {
                        const sourcePayloadId = parseInt(payloadMatch[1]);
                        // Find the response from the source payload in our context
                        const sourceResponse = context.responses.find(r => r.payloadId === sourcePayloadId);
                        if (sourceResponse) {
                            console.log(`[Context] Found response from payload ${sourcePayloadId} for response block ${block.title}`);
                            processedBlocks.push({
                                ...block,
                                content: sourceResponse.content
                            });
                        } else {
                            console.log(`[Context] No response found for payload ${sourcePayloadId} in response block ${block.title}`);
                            processedBlocks.push(block);
                        }
                    } else {
                        processedBlocks.push(block);
                    }
                } else {
                    processedBlocks.push(block);
                }
            }
            
            // Combine blocks into prompt
            let prompt = processedBlocks.map(b => b.content).join('\n\n');
            
            // Replace variables in the prompt with context from previous responses
            prompt = replaceVariables(prompt, context);
            
            // Get LLM configuration from payload
            const llmConfig = {
                temperature: payload.temperature || 0.6,
                response_length: payload.response_length || 1000,
                llm_port: payload.llm_port || 5001,
                model_format: payload.model_format || 'default'
            };
            
            // Log the prompt and configuration
            console.log(`[LLM] Prompt to be sent:`, prompt);
            console.log(`[LLM] Configuration:`, llmConfig);
            
            // Try to get model information before sending the prompt
            let modelInfo = null;
            try {
                modelInfo = await llmService.getModelInfo(llmConfig.llm_port);
                console.log(`[LLM] Retrieved model info:`, modelInfo);
            } catch (modelInfoError) {
                console.error(`[LLM] Failed to get model info:`, modelInfoError);
                // Continue anyway, this is non-critical
            }
            
            /* AI-CONTEXT: This is where the actual LLM interaction happens. The prompt
               is sent to the LLM service, which handles the communication with the 
               appropriate LLM instance based on the configuration. */
            
            // Send to LLM
            const startTime = Date.now();
            console.log(`[LLM] Sending prompt to port ${llmConfig.llm_port}`);
            const llmResponse = await llmService.sendPrompt(llmConfig.llm_port, prompt, {
                temperature: llmConfig.temperature,
                max_length: llmConfig.response_length,
                stream: false,
                model_format: llmConfig.model_format
            });
            const endTime = Date.now();
            
            // Process the response
            const processed = llmService.processResponse(llmResponse);
            console.log(`[LLM] Received response:`, processed.text);
            console.log(`[LLM] Response metadata:`, processed.metadata);
            
            // Calculate stats
            const durationMs = endTime - startTime;
            const tokensPerSecond = processed.metadata.tokens 
                ? Math.round((processed.metadata.tokens / durationMs) * 1000)
                : 0;
            
            console.log(`[LLM] Response stats:`, {
                duration_ms: durationMs,
                tokens_per_second: tokensPerSecond
            });
            
            // Store the response
            await db.run(`
                INSERT INTO responses (run_id, payload_id, content, metadata)
                VALUES (?, ?, ?, ?)
            `, [
                runId,
                payload.id,
                processed.text,
                JSON.stringify({
                    ...processed.metadata,
                    duration_ms: durationMs,
                    tokens_per_second: tokensPerSecond,
                    model_info: modelInfo,
                    llm_config: {
                        port: llmConfig.llm_port,
                        temperature: llmConfig.temperature,
                        max_length: llmConfig.response_length,
                        model_format: llmConfig.model_format
                    }
                })
            ]);
            
            // Add to context
            context.responses.push({
                payloadId: payload.id,
                payloadName: payload.name,
                content: processed.text.trim(),
                metadata: {
                    ...processed.metadata,
                    model_info: modelInfo,
                    duration_ms: durationMs,
                    tokens_per_second: tokensPerSecond
                }
            });
            
            // Log the updated context
            console.log('[Context] Updated context after payload:', payload.name);
            console.log('[Context] Responses:', context.responses);
            
            /* AI-EXTENSION-POINT: You can add additional real-time event types here
               to provide more detailed status updates during workflow execution.
               Follow the existing pattern of using the broadcast function with a 
               structured event object. */
            
            // Broadcast completion of this payload
            if (broadcast) {
                broadcast({
                    type: 'payload_completed',
                    data: {
                        runId,
                        payloadId: payload.id,
                        payloadName: payload.name,
                        content: processed.text,
                        metadata: {
                            ...processed.metadata,
                            duration_ms: durationMs,
                            tokens_per_second: tokensPerSecond,
                            model_info: modelInfo
                        }
                    }
                });
            }
        }
        
        // Update run status to completed
        await db.run(`
            UPDATE runs 
            SET status = 'completed', 
                completed_at = CURRENT_TIMESTAMP,
                metadata = json_set(metadata, '$.completed_at', ?)
            WHERE id = ?
        `, [new Date().toISOString(), runId]);
        
        // Also update the run's metadata to include model information from all responses
        const allModels = context.responses
            .filter(r => r.metadata && r.metadata.model_info)
            .map(r => ({
                payloadName: r.payloadName,
                modelInfo: r.metadata.model_info
            }));
        
        if (allModels.length > 0) {
            await db.run(`
                UPDATE runs 
                SET metadata = json_set(metadata, '$.models', ?)
                WHERE id = ?
            `, [JSON.stringify(allModels), runId]);
        }
        
        // Broadcast workflow completion
        if (broadcast) {
            broadcast({
                type: 'workflow_completed',
                data: {
                    runId,
                    status: 'completed'
                }
            });
        }
        
    } catch (error) {
        console.error('Error executing workflow:', error);
        
        /* AI-CONTEXT: Error handling pattern used throughout the application.
           On error, the run status is updated to 'failed', the error message
           is stored in metadata, and a failure event is broadcast to clients. */
        
        // Update run status to failed
        await db.run(`
            UPDATE runs 
            SET status = 'failed',
                completed_at = CURRENT_TIMESTAMP,
                metadata = json_set(metadata, '$.error', ?)
            WHERE id = ?
        `, [error.message, runId]);
        
        // Broadcast failure
        if (broadcast) {
            broadcast({
                type: 'workflow_failed',
                data: {
                    runId,
                    error: error.message
                }
            });
        }
    }
}

/* AI-CONTEXT: This module exports both the router object and a setBroadcast function.
   This pattern allows the server.js file to provide the broadcast functionality
   while still having access to the router for Express configuration. */
module.exports = {
    router,
    setBroadcast: (broadcastFn) => {
        broadcast = broadcastFn;
    }
};