/**
 * LLM Orchestration Application
 * LLM management routes
 */

const express = require('express');
const router = express.Router();
const llmService = require('../services/init-llm');

// Broadcast function for WebSocket updates
let broadcast = null;

// Set broadcast function
router.setBroadcast = (broadcastFn) => {
    broadcast = broadcastFn;
};

/**
 * Get all registered LLM instances
 */
router.get('/instances', (req, res) => {
    try {
        const instances = llmService.getInstances();
        res.json(instances);
    } catch (error) {
        console.error('Error fetching LLM instances:', error);
        res.status(500).json({ error: 'Failed to fetch LLM instances' });
    }
});

/**
 * Test connectivity to an LLM instance
 */
router.get('/test/:port', async (req, res) => {
    const port = parseInt(req.params.port, 10);
    
    if (isNaN(port) || port <= 0 || port > 65535) {
        return res.status(400).json({ error: 'Invalid port number' });
    }
    
    try {
        const result = await llmService.testConnectivity(port);
        
        // Broadcast result
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: result.connected ? 'INFO' : 'WARNING',
                message: result.connected 
                    ? `Successfully connected to LLM on port ${port}` 
                    : `Failed to connect to LLM on port ${port}`
            });
        }
        
        res.json(result);
    } catch (error) {
        console.error(`Error testing LLM connectivity on port ${port}:`, error);
        res.status(500).json({ 
            error: 'Failed to test LLM connectivity',
            details: error.message
        });
    }
});

/**
 * Get detailed information about an LLM instance including supported APIs
 */
router.get('/detailed-test/:port', async (req, res) => {
    const port = parseInt(req.params.port, 10);
    
    if (isNaN(port) || port <= 0 || port > 65535) {
        return res.status(400).json({ error: 'Invalid port number' });
    }
    
    try {
        const result = await llmService.getDetailedConnectivity(port);
        
        // Broadcast result
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: result.connected ? 'INFO' : 'WARNING',
                message: result.connected 
                    ? `Detailed connectivity test successful for LLM on port ${port}` 
                    : `Detailed connectivity test failed for LLM on port ${port}`
            });
        }
        
        res.json(result);
    } catch (error) {
        console.error(`Error performing detailed LLM test on port ${port}:`, error);
        res.status(500).json({ 
            error: 'Failed to perform detailed LLM test',
            details: error.message
        });
    }
});

/**
 * Get model information from an LLM instance
 */
router.get('/model/:port', async (req, res) => {
    const port = parseInt(req.params.port, 10);
    
    if (isNaN(port) || port <= 0 || port > 65535) {
        return res.status(400).json({ error: 'Invalid port number' });
    }
    
    try {
        const modelInfo = await llmService.getModelInfo(port);
        res.json(modelInfo);
    } catch (error) {
        console.error(`Error fetching model info for LLM on port ${port}:`, error);
        res.status(500).json({ 
            error: 'Failed to fetch model information',
            details: error.message
        });
    }
});

/**
 * Register a new LLM instance
 */
router.post('/register', (req, res) => {
    const { port, name, config } = req.body;
    
    if (!port || isNaN(parseInt(port, 10))) {
        return res.status(400).json({ error: 'Valid port number is required' });
    }
    
    try {
        llmService.registerInstance(
            parseInt(port, 10),
            name || `LLM on port ${port}`,
            config || {}
        );
        
        // Broadcast registration
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: `Registered LLM "${name || `LLM on port ${port}`}" on port ${port}`
            });
        }
        
        res.status(201).json({
            success: true,
            message: 'LLM instance registered successfully',
            instance: llmService.getInstance(parseInt(port, 10))
        });
    } catch (error) {
        console.error('Error registering LLM instance:', error);
        res.status(500).json({ error: 'Failed to register LLM instance' });
    }
});

module.exports = router;