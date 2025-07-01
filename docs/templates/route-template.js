/**
 * LLM Orchestration Application
 * [Resource Name] Routes
 * 
 * AI-CONTEXT: This module defines API endpoints for [resource name] operations.
 * It follows the REST pattern for endpoint design and includes WebSocket broadcast
 * capability for real-time updates.
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
// const someService = require('../services/some-service');

// Broadcast function for WebSocket updates
let broadcast = null;

/**
 * Sets the WebSocket broadcast function
 * 
 * AI-CONTEXT: This injection pattern allows the server.js file to provide
 * the WebSocket broadcast functionality to this module without creating
 * circular dependencies.
 */
router.setBroadcast = (broadcastFn) => {
    broadcast = broadcastFn;
};

/**
 * Get all [resources]
 * 
 * AI-CONTEXT: Standard GET endpoint for retrieving all resources of this type.
 * Includes optional filtering via query parameters.
 */
router.get('/', async (req, res) => {
    try {
        // Extract query parameters for filtering
        const { limit, status } = req.query;
        
        // Build query based on filters
        let query = 'SELECT * FROM [table_name]';
        const params = [];
        
        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }
        
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit, 10));
        }
        
        // Execute query
        const results = await db.all(query, params);
        
        // Return results
        res.json(results);
    } catch (error) {
        console.error('Error fetching [resources]:', error);
        res.status(500).json({ error: 'Failed to fetch [resources]: ' + error.message });
    }
});

/**
 * Get a specific [resource] by ID
 * 
 * AI-CONTEXT: Standard GET endpoint for retrieving a single resource by ID.
 */
router.get('/:id', async (req, res) => {
    try {
        const result = await db.get('SELECT * FROM [table_name] WHERE id = ?', [req.params.id]);
        
        if (!result) {
            return res.status(404).json({ error: '[Resource] not found' });
        }
        
        res.json(result);
    } catch (error) {
        console.error(`Error fetching [resource] ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to fetch [resource]: ' + error.message });
    }
});

/**
 * Create a new [resource]
 * 
 * AI-CONTEXT: Standard POST endpoint for creating a new resource.
 */
router.post('/', async (req, res) => {
    try {
        // Extract and validate required fields
        const { requiredField1, requiredField2 } = req.body;
        
        if (!requiredField1 || !requiredField2) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Insert into database
        const result = await db.run(
            'INSERT INTO [table_name] (field1, field2) VALUES (?, ?)',
            [requiredField1, requiredField2]
        );
        
        // Get the created resource
        const createdResource = await db.get(
            'SELECT * FROM [table_name] WHERE id = ?',
            [result.lastID]
        );
        
        // Broadcast creation event if WebSocket is enabled
        if (broadcast) {
            broadcast({
                type: '[resource]_created',
                data: createdResource
            });
        }
        
        // Return the created resource
        res.status(201).json(createdResource);
    } catch (error) {
        console.error('Error creating [resource]:', error);
        res.status(500).json({ error: 'Failed to create [resource]: ' + error.message });
    }
});

/**
 * Update a [resource]
 * 
 * AI-CONTEXT: Standard PUT endpoint for updating an existing resource.
 */
router.put('/:id', async (req, res) => {
    try {
        // Check if resource exists
        const existingResource = await db.get(
            'SELECT * FROM [table_name] WHERE id = ?',
            [req.params.id]
        );
        
        if (!existingResource) {
            return res.status(404).json({ error: '[Resource] not found' });
        }
        
        // Extract fields to update
        const { field1, field2 } = req.body;
        
        // Update in database
        await db.run(
            'UPDATE [table_name] SET field1 = ?, field2 = ? WHERE id = ?',
            [field1, field2, req.params.id]
        );
        
        // Get the updated resource
        const updatedResource = await db.get(
            'SELECT * FROM [table_name] WHERE id = ?',
            [req.params.id]
        );
        
        // Broadcast update event if WebSocket is enabled
        if (broadcast) {
            broadcast({
                type: '[resource]_updated',
                data: updatedResource
            });
        }
        
        // Return the updated resource
        res.json(updatedResource);
    } catch (error) {
        console.error(`Error updating [resource] ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to update [resource]: ' + error.message });
    }
});

/**
 * Delete a [resource]
 * 
 * AI-CONTEXT: Standard DELETE endpoint for removing a resource.
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check if resource exists
        const existingResource = await db.get(
            'SELECT * FROM [table_name] WHERE id = ?',
            [req.params.id]
        );
        
        if (!existingResource) {
            return res.status(404).json({ error: '[Resource] not found' });
        }
        
        // Delete from database
        await db.run('DELETE FROM [table_name] WHERE id = ?', [req.params.id]);
        
        // Broadcast deletion event if WebSocket is enabled
        if (broadcast) {
            broadcast({
                type: '[resource]_deleted',
                data: {
                    id: parseInt(req.params.id, 10)
                }
            });
        }
        
        // Return success message
        res.json({ message: '[Resource] deleted successfully' });
    } catch (error) {
        console.error(`Error deleting [resource] ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to delete [resource]: ' + error.message });
    }
});

/* AI-CONTEXT: This export pattern includes both the router and a method to set
   the broadcast function. This allows the server.js file to configure WebSocket
   broadcasts while still accessing the router for Express configuration. */
module.exports = {
    router,
    setBroadcast: (broadcastFn) => {
        broadcast = broadcastFn;
    }
};
