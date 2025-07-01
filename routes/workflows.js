const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Broadcast function for WebSocket updates
let broadcast = null;

// Set broadcast function
router.setBroadcast = (broadcastFn) => {
    broadcast = broadcastFn;
};

// Get all workflows with their payloads
router.get('/', async (req, res) => {
    try {
        // Get all workflows
        const workflows = await db.all('SELECT * FROM workflows');
        
        // Get payloads for each workflow
        for (let workflow of workflows) {
            const payloads = await db.all(`
                SELECT p.* FROM payloads p
                JOIN workflow_payloads wp ON p.id = wp.payload_id
                WHERE wp.workflow_id = ?
                ORDER BY wp.order_index
            `, [workflow.id]);
            
            workflow.payloads = payloads;
        }
        
        res.json(workflows);
    } catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ error: 'Failed to fetch workflows' });
    }
});

// Get a single workflow by ID with its payloads
router.get('/:id', async (req, res) => {
    try {
        // Get workflow by ID
        const workflow = await db.get('SELECT * FROM workflows WHERE id = ?', [req.params.id]);
        
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        
        // Get payloads for the workflow
        const payloads = await db.all(`
            SELECT p.* FROM payloads p
            JOIN workflow_payloads wp ON p.id = wp.payload_id
            WHERE wp.workflow_id = ?
            ORDER BY wp.order_index
        `, [req.params.id]);
        
        workflow.payloads = payloads;
        
        res.json(workflow);
    } catch (error) {
        console.error('Error fetching workflow:', error);
        res.status(500).json({ error: 'Failed to fetch workflow' });
    }
});

// Create a new workflow
router.post('/', async (req, res) => {
    const { name, payloads } = req.body;
    
    if (!name || !Array.isArray(payloads)) {
        return res.status(400).json({ error: 'Name and payloads array are required' });
    }

    try {
        // Start transaction
        await db.run('BEGIN TRANSACTION');
        
        // Insert workflow
        const result = await db.run(
            'INSERT INTO workflows (name) VALUES (?)',
            [name]
        );
        
        const workflowId = result.lastID;
        
        // Insert workflow payloads
        for (let i = 0; i < payloads.length; i++) {
            const payloadId = typeof payloads[i] === 'object' ? payloads[i].id : payloads[i];
            await db.run(
                'INSERT INTO workflow_payloads (workflow_id, payload_id, order_index) VALUES (?, ?, ?)',
                [workflowId, payloadId, i]
            );
        }
        
        // Commit transaction
        await db.run('COMMIT');
        
        // Get the complete workflow with payloads
        const newWorkflow = await db.get('SELECT * FROM workflows WHERE id = ?', [workflowId]);
        
        // Get payloads details
        const payloadDetails = await db.all(`
            SELECT p.* FROM payloads p
            JOIN workflow_payloads wp ON p.id = wp.payload_id
            WHERE wp.workflow_id = ?
            ORDER BY wp.order_index
        `, [workflowId]);
        
        newWorkflow.payloads = payloadDetails;
        
        // Broadcast creation event
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: `Workflow "${name}" created`
            });
            
            broadcast({
                type: 'WORKFLOW_CREATED',
                workflow: newWorkflow
            });
        }
        
        res.status(201).json(newWorkflow);
    } catch (error) {
        // Rollback transaction on error
        await db.run('ROLLBACK');
        console.error('Error creating workflow:', error);
        res.status(500).json({ error: 'Failed to create workflow: ' + error.message });
    }
});

// Update a workflow
router.put('/:id', async (req, res) => {
    const { name, payloads } = req.body;
    
    if (!name || !Array.isArray(payloads)) {
        return res.status(400).json({ error: 'Name and payloads array are required' });
    }

    try {
        // Check if workflow exists
        const existingWorkflow = await db.get('SELECT * FROM workflows WHERE id = ?', [req.params.id]);
        
        if (!existingWorkflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        
        // Start transaction
        await db.run('BEGIN TRANSACTION');
        
        // Update workflow
        await db.run(
            'UPDATE workflows SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, req.params.id]
        );
        
        // Delete existing workflow payloads
        await db.run('DELETE FROM workflow_payloads WHERE workflow_id = ?', [req.params.id]);
        
        // Insert new workflow payloads
        for (let i = 0; i < payloads.length; i++) {
            const payloadId = typeof payloads[i] === 'object' ? payloads[i].id : payloads[i];
            await db.run(
                'INSERT INTO workflow_payloads (workflow_id, payload_id, order_index) VALUES (?, ?, ?)',
                [req.params.id, payloadId, i]
            );
        }
        
        // Commit transaction
        await db.run('COMMIT');
        
        // Get the updated workflow with payloads
        const updatedWorkflow = await db.get('SELECT * FROM workflows WHERE id = ?', [req.params.id]);
        
        // Get payloads details
        const payloadDetails = await db.all(`
            SELECT p.* FROM payloads p
            JOIN workflow_payloads wp ON p.id = wp.payload_id
            WHERE wp.workflow_id = ?
            ORDER BY wp.order_index
        `, [req.params.id]);
        
        updatedWorkflow.payloads = payloadDetails;
        
        // Broadcast the updated workflow
        if (broadcast) {
            broadcast({
                type: 'WORKFLOW_UPDATED',
                workflow: updatedWorkflow
            });
        }
        
        res.json(updatedWorkflow);
    } catch (error) {
        // Rollback transaction on error
        await db.run('ROLLBACK');
        console.error('Error updating workflow:', error);
        res.status(500).json({ error: 'Failed to update workflow: ' + error.message });
    }
});

// Delete a workflow
router.delete('/:id', async (req, res) => {
    try {
        // Check if workflow exists
        const workflow = await db.get('SELECT * FROM workflows WHERE id = ?', [req.params.id]);
        
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        
        // Start transaction
        await db.run('BEGIN TRANSACTION');
        
        // Delete workflow payloads (cascade will handle this automatically but we'll do it explicitly)
        await db.run('DELETE FROM workflow_payloads WHERE workflow_id = ?', [req.params.id]);
        
        // Delete workflow
        await db.run('DELETE FROM workflows WHERE id = ?', [req.params.id]);
        
        // Commit transaction
        await db.run('COMMIT');
        
        // Broadcast deletion event
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: `Workflow "${workflow.name}" deleted`
            });
            
            broadcast({
                type: 'WORKFLOW_DELETED',
                workflowId: parseInt(req.params.id)
            });
        }
        
        // Return 204 No Content status for successful deletion
        res.status(204).send();
    } catch (error) {
        // Rollback transaction on error
        await db.run('ROLLBACK');
        console.error('Error deleting workflow:', error);
        res.status(500).json({ error: 'Failed to delete workflow: ' + error.message });
    }
});

module.exports = router;