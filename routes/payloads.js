const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Broadcast function for WebSocket updates
let broadcast = null;

// Set broadcast function
router.setBroadcast = (broadcastFn) => {
    broadcast = broadcastFn;
};

// Broadcast helper function
const broadcastUpdate = (type, data) => {
    if (broadcast) {
        broadcast({
            type: `PAYLOAD_${type}`,
            data
        });
    }
};

// Get all payloads with their blocks
router.get('/', async (req, res) => {
    try {
        // Get all payloads
        const payloads = await db.all('SELECT * FROM payloads');
        
        // Get blocks for each payload
        for (let payload of payloads) {
            const blocks = await db.all(`
                SELECT b.* FROM blocks b
                JOIN payload_blocks pb ON b.id = pb.block_id
                WHERE pb.payload_id = ?
                ORDER BY pb.order_index
            `, [payload.id]);
            
            payload.blocks = blocks;
            // Create config object from individual columns
            payload.config = {
                temperature: payload.temperature,
                response_length: payload.response_length,
                llm_port: payload.llm_port,
                model_format: payload.model_format || 'default'
            };
        }
        
        res.json(payloads);
    } catch (error) {
        console.error('Error fetching payloads:', error);
        res.status(500).json({ error: 'Failed to fetch payloads' });
    }
});

// Get a single payload by ID with its blocks
router.get('/:id', async (req, res) => {
    try {
        const payload = await db.all('SELECT * FROM payloads WHERE id = ?', [req.params.id]);
        if (!payload.length) {
            return res.status(404).json({ error: 'Payload not found' });
        }
        
        // Get blocks for the payload
        const blocks = await db.all(`
            SELECT b.* FROM blocks b
            JOIN payload_blocks pb ON b.id = pb.block_id
            WHERE pb.payload_id = ?
            ORDER BY pb.order_index
        `, [req.params.id]);
        
        payload[0].blocks = blocks;
        // Create config object from individual columns
        payload[0].config = {
            temperature: payload[0].temperature,
            response_length: payload[0].response_length,
            llm_port: payload[0].llm_port,
            model_format: payload[0].model_format || 'default'
        };
        
        res.json(payload[0]);
    } catch (error) {
        console.error('Error fetching payload:', error);
        res.status(500).json({ error: 'Failed to fetch payload' });
    }
});

// Create a new payload
router.post('/', async (req, res) => {
    const { name, blocks, config } = req.body;
    
    if (!name || !Array.isArray(blocks) || !config) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Check if payload with same name already exists
        const existingPayload = await db.get('SELECT * FROM payloads WHERE name = ?', [name]);
        if (existingPayload) {
            return res.status(409).json({ error: 'A payload with this name already exists' });
        }

        // Start a transaction to ensure atomicity
        await db.run('BEGIN TRANSACTION');
        
        try {
            // Insert payload with individual columns
            const result = await db.run(
                'INSERT INTO payloads (name, temperature, response_length, llm_port, model_format) VALUES (?, ?, ?, ?, ?)',
                [name, config.temperature || 0.6, config.response_length || 1000, config.llm_port || 5001, config.model_format || 'default']
            );
            
            const payloadId = result.lastID;
            
            // Insert payload blocks
            for (let i = 0; i < blocks.length; i++) {
                const blockId = typeof blocks[i] === 'object' ? blocks[i].id : blocks[i];
                await db.run(
                    'INSERT INTO payload_blocks (payload_id, block_id, order_index) VALUES (?, ?, ?)',
                    [payloadId, blockId, i]
                );
            }
            
            // Create response block
            let responseBlock = null;
            try {
                const responseBlockTitle = `${name} - response`;
                
                // Check if response block already exists
                const existingResponseBlock = await db.get(
                    'SELECT * FROM blocks WHERE title = ? AND tags LIKE ?',
                    [responseBlockTitle, '%response%']
                );
                
                if (existingResponseBlock) {
                    console.log('Response block already exists, using existing one');
                    responseBlock = existingResponseBlock;
                } else {
                    const responseBlockResult = await db.run(
                        'INSERT INTO blocks (title, content, tags, folder_path) VALUES (?, ?, ?, ?)',
                        [responseBlockTitle, '', `response,payload_${payloadId}`, 'Responses']
                    );
                    console.log('Created response block with ID:', responseBlockResult.lastID);
                    
                    // Get the response block details
                    responseBlock = await db.get(
                        'SELECT * FROM blocks WHERE id = ?',
                        [responseBlockResult.lastID]
                    );
                }
            } catch (blockError) {
                console.error('Error creating response block:', blockError);
                // Don't fail the whole request if response block creation fails
            }
            
            // Get the complete payload with blocks
            const newPayload = await db.all('SELECT * FROM payloads WHERE id = ?', [payloadId]);
            
            // Get block details
            const blockDetails = await db.all(`
                SELECT b.* FROM blocks b
                JOIN payload_blocks pb ON b.id = pb.block_id
                WHERE pb.payload_id = ?
                ORDER BY pb.order_index
            `, [payloadId]);
            
            newPayload[0].blocks = blockDetails;
            newPayload[0].config = {
                temperature: newPayload[0].temperature,
                response_length: newPayload[0].response_length,
                llm_port: newPayload[0].llm_port,
                model_format: newPayload[0].model_format || 'default'
            };
            if (responseBlock) {
                newPayload[0].responseBlock = responseBlock;
            }
            
            // Commit the transaction
            await db.run('COMMIT');
            
            // Broadcast payload creation event and system message
            if (broadcast) {
                try {
                    // Broadcast system message first
                    broadcast({
                        type: 'SYSTEM_MESSAGE',
                        level: 'INFO',
                        message: `Payload "${name}" created`
                    });
                    
                    // Then broadcast payload creation event
                    broadcast({
                        type: 'PAYLOAD_CREATED',
                        payload: newPayload[0]
                    });
                } catch (broadcastError) {
                    console.error('Error broadcasting payload creation:', broadcastError);
                    // Don't fail the request if broadcast fails
                }
            }
            
            res.status(201).json(newPayload[0]);
        } catch (error) {
            // Rollback the transaction on error
            await db.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating payload:', error);
        res.status(500).json({ error: 'Failed to create payload: ' + error.message });
    }
});

// Update a payload
router.put('/:id', async (req, res) => {
    const { name, blocks, config } = req.body;
    
    if (!name || !Array.isArray(blocks) || !config) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Update payload with individual columns
        const result = await db.run(
            'UPDATE payloads SET name = ?, temperature = ?, response_length = ?, llm_port = ?, model_format = ? WHERE id = ?',
            [name, config.temperature || 0.6, config.response_length || 1000, config.llm_port || 5001, config.model_format || 'default', req.params.id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Payload not found' });
        }
        
        // Delete existing payload blocks
        await db.run('DELETE FROM payload_blocks WHERE payload_id = ?', [req.params.id]);
        
        // Insert new payload blocks
        for (let i = 0; i < blocks.length; i++) {
            // Handle both block objects and block IDs
            const blockId = typeof blocks[i] === 'object' ? blocks[i].id : blocks[i];
            await db.run(
                'INSERT INTO payload_blocks (payload_id, block_id, order_index) VALUES (?, ?, ?)',
                [req.params.id, blockId, i]
            );
        }
        
        // Get the complete updated payload with blocks
        const updatedPayload = await db.all('SELECT * FROM payloads WHERE id = ?', [req.params.id]);
        
        // Get block details
        const blockDetails = await db.all(`
            SELECT b.* FROM blocks b
            JOIN payload_blocks pb ON b.id = pb.block_id
            WHERE pb.payload_id = ?
            ORDER BY pb.order_index
        `, [req.params.id]);
        
        updatedPayload[0].blocks = blockDetails;
        updatedPayload[0].config = {
            temperature: updatedPayload[0].temperature,
            response_length: updatedPayload[0].response_length,
            llm_port: updatedPayload[0].llm_port,
            model_format: updatedPayload[0].model_format || 'default'
        };
        
        // Broadcast the updated payload
        broadcastUpdate('UPDATED', updatedPayload[0]);
        
        res.json(updatedPayload[0]);
    } catch (error) {
        console.error('Error updating payload:', error);
        res.status(500).json({ error: 'Failed to update payload: ' + error.message });
    }
});

// Delete a payload
router.delete('/:id', async (req, res) => {
    try {
        // Delete payload blocks (cascade will handle this, but we'll do it explicitly)
        await db.run('DELETE FROM payload_blocks WHERE payload_id = ?', [req.params.id]);
        
        // Delete payload
        const result = await db.run('DELETE FROM payloads WHERE id = ?', [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Payload not found' });
        }
        
        // Broadcast the deleted payload ID
        broadcastUpdate('DELETED', { id: req.params.id });
        
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting payload:', error);
        res.status(500).json({ error: 'Failed to delete payload' });
    }
});

module.exports = router; 