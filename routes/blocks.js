/**
 * LLM Orchestration Application
 * Block API routes
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// WebSocket broadcast function will be injected when routes are mounted
let broadcast;

// Helper function to parse tags
function parseTags(tags) {
    if (Array.isArray(tags)) {
        return JSON.stringify(tags);
    } else if (typeof tags === 'string') {
        return tags;
    }
    return '';
}

/**
 * GET /api/blocks
 * Get all blocks
 */
router.get('/', async (req, res) => {
    try {
        const blocks = await db.all('SELECT * FROM blocks ORDER BY title');
        
        // Parse tags back to array
        const blocksWithParsedTags = blocks.map(block => ({
            ...block,
            tags: block.tags ? block.tags.split(',') : []
        }));
        
        res.json(blocksWithParsedTags);
    } catch (error) {
        console.error('Error retrieving blocks:', error);
        res.status(500).json({ error: 'Failed to retrieve blocks' });
    }
});

/**
 * GET /api/blocks/:id
 * Get a specific block by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const block = await db.get('SELECT * FROM blocks WHERE id = ?', [req.params.id]);
        
        if (!block) {
            return res.status(404).json({ error: 'Block not found' });
        }
        
        // Parse tags back to array
        block.tags = block.tags ? block.tags.split(',') : [];
        
        res.json(block);
    } catch (error) {
        console.error('Error retrieving block:', error);
        res.status(500).json({ error: 'Failed to retrieve block' });
    }
});

/**
 * POST /api/blocks
 * Create a new block
 */
router.post('/', async (req, res) => {
    try {
        const { title, content, tags, folder_path } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        // Check if block with same title already exists
        const existingBlock = await db.get(
            'SELECT * FROM blocks WHERE title = ? AND folder_path = ?',
            [title, folder_path || '']
        );
        
        if (existingBlock) {
            return res.status(409).json({ error: 'A block with this title already exists in this folder' });
        }
        
        const parsedTags = Array.isArray(tags) ? tags.join(',') : tags;
        
        // Create the block without explicit transaction
        const result = await db.run(
            'INSERT INTO blocks (title, content, tags, folder_path) VALUES (?, ?, ?, ?)',
            [title, content || '', parsedTags || '', folder_path || '']
        );
        
        const newBlock = {
            id: result.lastID,
            title,
            content: content || '',
            tags: tags || [],
            folder_path: folder_path || '',
            created_at: new Date().toISOString()
        };
        
        // Broadcast block creation event and system message
        if (broadcast) {
            try {
                // Broadcast system message
                broadcast({
                    type: 'SYSTEM_MESSAGE',
                    level: 'INFO',
                    message: `Block "${title}" created`
                });
                
                // Broadcast block creation event
                broadcast({
                    type: 'BLOCK_CREATED',
                    block: newBlock
                });
            } catch (broadcastError) {
                console.error('Error broadcasting block creation:', broadcastError);
                // Don't fail the request if broadcast fails
            }
        }
        
        res.status(201).json(newBlock);
    } catch (error) {
        console.error('Error creating block:', error);
        res.status(500).json({ error: 'Failed to create block' });
    }
});

/**
 * PUT /api/blocks/:id
 * Update a block
 */
router.put('/:id', async (req, res) => {
    try {
        const { title, content, tags, folder_path } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        // Check if block exists
        const existingBlock = await db.get('SELECT * FROM blocks WHERE id = ?', [req.params.id]);
        
        if (!existingBlock) {
            return res.status(404).json({ error: 'Block not found' });
        }
        
        const parsedTags = Array.isArray(tags) ? tags.join(',') : tags;
        
        await db.run(
            'UPDATE blocks SET title = ?, content = ?, tags = ?, folder_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, content || '', parsedTags || '', folder_path || '', req.params.id]
        );
        
        const updatedBlock = {
            id: parseInt(req.params.id),
            title,
            content: content || '',
            tags: tags || [],
            folder_path: folder_path || '',
            updated_at: new Date().toISOString()
        };
        
        // Broadcast system message
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: `Block "${title}" updated`
            });
        }
        
        res.json(updatedBlock);
    } catch (error) {
        console.error('Error updating block:', error);
        res.status(500).json({ error: 'Failed to update block' });
    }
});

/**
 * DELETE /api/blocks/:id
 * Delete a block
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check if block exists
        const block = await db.get('SELECT * FROM blocks WHERE id = ?', [req.params.id]);
        
        if (!block) {
            return res.status(404).json({ error: 'Block not found' });
        }
        
        await db.run('DELETE FROM blocks WHERE id = ?', [req.params.id]);
        
        // Broadcast system message
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: `Block "${block.title}" deleted`
            });
            
            // Also broadcast specific event for block deletion
            broadcast({
                type: 'BLOCK_DELETED',
                blockId: parseInt(req.params.id)
            });
        }
        
        // Return 204 No Content status for successful deletion
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting block:', error);
        res.status(500).json({ error: 'Failed to delete block' });
    }
});

// Set the broadcast function
router.setBroadcast = function(broadcastFn) {
    broadcast = broadcastFn;
};

module.exports = router;