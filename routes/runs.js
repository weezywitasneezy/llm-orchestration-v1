const express = require('express');
const router = express.Router();
const db = require('../config/database');

let broadcast = null;

/**
 * Set the broadcast function for real-time updates
 * @param {Function} broadcastFn - Function to broadcast messages to connected clients
 */
function setBroadcast(broadcastFn) {
    broadcast = broadcastFn;
}

/**
 * Broadcast a message to all connected clients
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
function broadcastMessage(type, data) {
    if (broadcast) {
        broadcast({
            type,
            data
        });
    }
}

/**
 * Get all runs with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        const { workflow_id, status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT r.*, w.name as workflow_name,
                   COUNT(resp.id) as response_count
            FROM runs r
            LEFT JOIN workflows w ON r.workflow_id = w.id
            LEFT JOIN responses resp ON r.id = resp.run_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (workflow_id) {
            query += ' AND r.workflow_id = ?';
            params.push(workflow_id);
        }
        
        if (status) {
            query += ' AND r.status = ?';
            params.push(status);
        }
        
        query += ' GROUP BY r.id ORDER BY r.started_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const runs = await db.all(query, params);
        
        // Parse metadata JSON for each run
        runs.forEach(run => {
            if (run.metadata) {
                run.metadata = JSON.parse(run.metadata);
            }
        });
        
        res.json(runs);
    } catch (error) {
        console.error('Error fetching runs:', error);
        res.status(500).json({ error: 'Failed to fetch runs' });
    }
});

/**
 * Get a specific run by ID with its responses
 */
router.get('/:id', async (req, res) => {
    try {
        const runId = req.params.id;
        
        // Get run details
        const run = await db.get(`
            SELECT r.*, w.name as workflow_name
            FROM runs r
            LEFT JOIN workflows w ON r.workflow_id = w.id
            WHERE r.id = ?
        `, [runId]);
        
        if (!run) {
            return res.status(404).json({ error: 'Run not found' });
        }
        
        // Get responses for this run
        const responses = await db.all(`
            SELECT r.*, p.name as payload_name
            FROM responses r
            LEFT JOIN payloads p ON r.payload_id = p.id
            WHERE r.run_id = ?
            ORDER BY r.created_at ASC
        `, [runId]);
        
        // Parse metadata JSON
        if (run.metadata) {
            run.metadata = JSON.parse(run.metadata);
        }
        
        responses.forEach(response => {
            if (response.metadata) {
                response.metadata = JSON.parse(response.metadata);
            }
        });
        
        res.json({
            ...run,
            responses
        });
    } catch (error) {
        console.error('Error fetching run details:', error);
        res.status(500).json({ error: 'Failed to fetch run details' });
    }
});

/**
 * Create a new run
 */
router.post('/', async (req, res) => {
    try {
        const { workflow_id, metadata } = req.body;
        
        const result = await db.run(`
            INSERT INTO runs (workflow_id, status, started_at, metadata)
            VALUES (?, 'running', datetime('now'), ?)
        `, [workflow_id, metadata ? JSON.stringify(metadata) : null]);
        
        const runId = result.lastID;
        
        // Broadcast run creation
        broadcastMessage('RUN_CREATED', {
            id: runId,
            workflow_id,
            status: 'running',
            started_at: new Date().toISOString()
        });
        
        res.json({ id: runId });
    } catch (error) {
        console.error('Error creating run:', error);
        res.status(500).json({ error: 'Failed to create run' });
    }
});

/**
 * Update run status
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, metadata } = req.body;
        
        const updates = ['status = ?'];
        const params = [status];
        
        if (status === 'completed' || status === 'failed') {
            updates.push('completed_at = datetime("now")');
        }
        
        if (metadata) {
            updates.push('metadata = ?');
            params.push(JSON.stringify(metadata));
        }
        
        params.push(id);
        
        await db.run(`
            UPDATE runs 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, params);
        
        // Broadcast status update
        broadcastMessage('RUN_STATUS_UPDATED', {
            id,
            status,
            completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
            metadata
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating run status:', error);
        res.status(500).json({ error: 'Failed to update run status' });
    }
});

/**
 * Store a response for a run
 */
router.post('/:id/responses', async (req, res) => {
    try {
        const runId = req.params.id;
        const { payload_id, content, metadata } = req.body;
        
        const result = await db.run(`
            INSERT INTO responses (run_id, payload_id, content, metadata)
            VALUES (?, ?, ?, ?)
        `, [runId, payload_id, content, metadata ? JSON.stringify(metadata) : null]);
        
        res.json({
            id: result.lastID,
            run_id: runId,
            payload_id,
            content,
            metadata: metadata || null
        });
    } catch (error) {
        console.error('Error storing response:', error);
        res.status(500).json({ error: 'Failed to store response' });
    }
});

/**
 * Delete a run and its responses
 */
router.delete('/:id', async (req, res) => {
    try {
        const runId = req.params.id;
        
        // Delete responses first (due to foreign key constraint)
        await db.run('DELETE FROM responses WHERE run_id = ?', [runId]);
        
        // Delete the run
        await db.run('DELETE FROM runs WHERE id = ?', [runId]);
        
        // Broadcast run deletion with additional debug info
        console.log(`Broadcasting RUN_DELETED for run ID: ${runId}`);
        broadcastMessage('RUN_DELETED', { 
            id: runId,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting run:', error);
        res.status(500).json({ error: 'Failed to delete run' });
    }
});

module.exports = {
    router,
    setBroadcast
}; 