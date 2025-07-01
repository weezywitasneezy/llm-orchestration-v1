/**
 * LLM Orchestration Application
 * Database management API routes
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const copyFile = promisify(fs.copyFile);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const sqlite3 = require('sqlite3').verbose();

// WebSocket broadcast function will be injected when routes are mounted
let broadcast;

/**
 * GET /api/database/backup
 * Create a backup of the database
 */
router.get('/backup', async (req, res) => {
    try {
        const backupDir = path.join(__dirname, '..', 'data', 'backups');
        
        // Ensure backups directory exists
        if (!fs.existsSync(backupDir)) {
            await mkdir(backupDir, { recursive: true });
        }
        
        // Create a timestamp-based filename
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const backupFilename = `backup_${timestamp}.db`;
        const backupPath = path.join(backupDir, backupFilename);
        
        // Source database path
        const dbPath = path.join(__dirname, '..', 'data', 'llm_orchestration.db');
        
        // Copy the database file to create a backup
        await copyFile(dbPath, backupPath);
        
        // Broadcast system message
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: `Database backup created: ${backupFilename}`
            });
        }
        
        res.json({ 
            message: 'Backup created successfully',
            filename: backupFilename,
            path: backupPath
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

/**
 * GET /api/database/export
 * Export the database as a downloadable file
 */
router.get('/export', async (req, res) => {
    try {
        const dbPath = path.join(__dirname, '..', 'data', 'llm_orchestration.db');
        
        // Create a timestamp for the export filename
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const exportFilename = `llm_orchestration_export_${timestamp}.db`;
        
        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename=${exportFilename}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        // Create a read stream and pipe it to the response
        const fileStream = fs.createReadStream(dbPath);
        fileStream.pipe(res);
        
        // Broadcast system message
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: `Database exported as ${exportFilename}`
            });
        }
    } catch (error) {
        console.error('Error exporting database:', error);
        res.status(500).json({ error: 'Failed to export database' });
    }
});

/**
 * GET /api/database/backups
 * Get a list of available backups
 */
router.get('/backups', async (req, res) => {
    try {
        const backupDir = path.join(__dirname, '..', 'data', 'backups');
        
        // Ensure backups directory exists
        if (!fs.existsSync(backupDir)) {
            await mkdir(backupDir, { recursive: true });
            res.json({ backups: [] });
            return;
        }
        
        // Get list of backup files
        const files = fs.readdirSync(backupDir).filter(file => file.endsWith('.db'));
        
        // Get file stats for each backup
        const backups = await Promise.all(files.map(async file => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            
            return {
                filename: file,
                size: stats.size,
                created: stats.mtime
            };
        }));
        
        // Sort backups by creation date (newest first)
        backups.sort((a, b) => b.created - a.created);
        
        res.json({ backups });
    } catch (error) {
        console.error('Error getting backups:', error);
        res.status(500).json({ error: 'Failed to retrieve backups' });
    }
});

/**
 * POST /api/database/restore/:filename
 * Restore database from a backup
 */
router.post('/restore/:filename', async (req, res) => {
    try {
        const backupDir = path.join(__dirname, '..', 'data', 'backups');
        const filename = req.params.filename;
        
        // Validate filename
        if (!filename || !filename.endsWith('.db')) {
            return res.status(400).json({ error: 'Invalid backup filename' });
        }
        
        const backupPath = path.join(backupDir, filename);
        const dbPath = path.join(__dirname, '..', 'data', 'llm_orchestration.db');
        
        // Check if backup file exists
        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ error: 'Backup file not found' });
        }
        
        // Close the current database connection
        await db.close();
        
        // Create a backup of the current database before restoring
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const safetyBackupPath = path.join(backupDir, `pre_restore_${timestamp}.db`);
        
        try {
            await copyFile(dbPath, safetyBackupPath);
        } catch (backupError) {
            console.warn('Could not create safety backup before restore:', backupError);
            // Continue with restore even if safety backup fails
        }
        
        // Copy the backup file to replace the current database
        await copyFile(backupPath, dbPath);
        
        // Reinitialize the database connection
        await db.initialize();
        
        // Broadcast system message
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: `Database restored from backup: ${filename}`
            });
            
            // Also broadcast a reload event so clients know to refresh their data
            broadcast({
                type: 'DATABASE_RESTORED',
                message: 'Database has been restored from backup. Please refresh your data.'
            });
        }
        
        res.json({ 
            message: 'Database restored successfully',
            note: 'Please refresh the application to load the restored data.'
        });
    } catch (error) {
        console.error('Error restoring database:', error);
        
        // Try to reinitialize database connection in case of error
        try {
            await db.initialize();
        } catch (initError) {
            console.error('Error reinitializing database after failed restore:', initError);
        }
        
        res.status(500).json({ error: 'Failed to restore database' });
    }
});

/**
 * POST /api/database/import
 * Import a database file
 */
router.post('/import', express.raw({
    type: 'application/octet-stream',
    limit: '50mb'
}), async (req, res) => {
    try {
        // Check that we received a file
        if (!req.body || req.body.length === 0) {
            return res.status(400).json({ error: 'No file provided' });
        }
        
        // Create a temporary file path
        const tempDir = path.join(__dirname, '..', 'data', 'temp');
        
        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) {
            await mkdir(tempDir, { recursive: true });
        }
        
        const importTempPath = path.join(tempDir, `import_temp_${Date.now()}.db`);
        
        // Write the uploaded file to disk
        await writeFile(importTempPath, req.body);
        
        // Validate that the file is a valid SQLite database
        try {
            // Try to open the database to validate it
            const tempDb = new sqlite3.Database(importTempPath, sqlite3.OPEN_READONLY);
            
            // Basic validation - check if essential tables exist
            const validatePromise = new Promise((resolve, reject) => {
                tempDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('blocks', 'payloads', 'workflows', 'runs')", 
                    (err, tables) => {
                        if (err) return reject(err);
                        
                        // We expect to find at least some of our core tables
                        if (!tables || tables.length < 3) {
                            return reject(new Error('The imported file is not a valid LLM Orchestration database'));
                        }
                        
                        resolve();
                    });
            });
            
            await validatePromise;
            
            // Close the temporary database
            await new Promise((resolve, reject) => {
                tempDb.close(err => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        } catch (validationError) {
            // Clean up temp file
            try {
                fs.unlinkSync(importTempPath);
            } catch (cleanupError) {
                console.error('Error cleaning up temp file:', cleanupError);
            }
            
            return res.status(400).json({ 
                error: 'Invalid database file',
                details: validationError.message
            });
        }
        
        // Create a backup of the current database before importing
        const backupDir = path.join(__dirname, '..', 'data', 'backups');
        if (!fs.existsSync(backupDir)) {
            await mkdir(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const safetyBackupPath = path.join(backupDir, `pre_import_${timestamp}.db`);
        const dbPath = path.join(__dirname, '..', 'data', 'llm_orchestration.db');
        
        // Create a safety backup of current database
        try {
            await copyFile(dbPath, safetyBackupPath);
        } catch (backupError) {
            console.warn('Could not create safety backup before import:', backupError);
            // Continue with import even if safety backup fails
        }
        
        // Close the current database connection
        await db.close();
        
        // Replace the current database with the imported one
        await copyFile(importTempPath, dbPath);
        
        // Clean up temp file
        try {
            fs.unlinkSync(importTempPath);
        } catch (cleanupError) {
            console.error('Error cleaning up temp file:', cleanupError);
            // Non-critical error, continue
        }
        
        // Reinitialize the database connection
        await db.initialize();
        
        // Broadcast system message
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: 'Database imported successfully'
            });
            
            // Also broadcast a reload event so clients know to refresh their data
            broadcast({
                type: 'DATABASE_IMPORTED',
                message: 'Database has been imported. Please refresh your data.'
            });
        }
        
        res.json({ 
            message: 'Database imported successfully',
            note: 'Please refresh the application to load the imported data.'
        });
    } catch (error) {
        console.error('Error importing database:', error);
        
        // Try to reinitialize database connection in case of error
        try {
            await db.initialize();
        } catch (initError) {
            console.error('Error reinitializing database after failed import:', initError);
        }
        
        res.status(500).json({ error: 'Failed to import database' });
    }
});

/**
 * DELETE /api/database/backups/:filename
 * Delete a specific backup
 */
router.delete('/backups/:filename', async (req, res) => {
    try {
        const backupDir = path.join(__dirname, '..', 'data', 'backups');
        const filename = req.params.filename;
        
        // Validate filename
        if (!filename || !filename.endsWith('.db')) {
            return res.status(400).json({ error: 'Invalid backup filename' });
        }
        
        const backupPath = path.join(backupDir, filename);
        
        // Check if backup file exists
        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ error: 'Backup file not found' });
        }
        
        // Delete the backup file
        fs.unlinkSync(backupPath);
        
        // Broadcast system message
        if (broadcast) {
            broadcast({
                type: 'SYSTEM_MESSAGE',
                level: 'INFO',
                message: `Backup deleted: ${filename}`
            });
        }
        
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({ error: 'Failed to delete backup' });
    }
});

// Set the broadcast function
router.setBroadcast = function(broadcastFn) {
    broadcast = broadcastFn;
};

module.exports = router;