/**
 * LLM Orchestration Application
 * Database Manager - Handles database backup, restore, import, and export operations
 */

class DatabaseManager {
    constructor(app) {
        this.app = app;
        this.backups = [];
        
        // Initialize the database management modal
        this.initModal();
        
        // Setup event listeners for WebSocket messages
        this.setupMessageListeners();
    }
    
    /**
     * Initialize the database management modal
     */
    initModal() {
        // Create modal if it doesn't exist
        if (!document.getElementById('database-modal')) {
            const modalHtml = `
                <div id="database-modal" class="modal hidden">
                    <div class="modal-content">
                        <h3>Database Management</h3>
                        
                        <div class="modal-body">
                            <div class="db-actions">
                                <div class="action-group">
                                    <h4>Create and Export</h4>
                                    <div class="button-group">
                                        <button id="create-backup-btn" class="action-btn">Create Backup</button>
                                        <button id="export-db-btn" class="action-btn">Export Database</button>
                                    </div>
                                </div>
                                
                                <div class="action-group">
                                    <h4>Import Database</h4>
                                    <p>Import a previously exported database file.</p>
                                    <div class="file-upload">
                                        <input type="file" id="db-import-input" accept=".db" />
                                        <button id="import-db-btn" class="action-btn">Upload and Import</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="backups-section">
                                <h4>Available Backups</h4>
                                <div id="backups-list" class="backups-list">
                                    <p class="empty-message">No backups found.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button id="close-db-modal-btn" class="secondary-btn">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add CSS styles for the database modal
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .db-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                    padding: 1rem;
                    background-color: var(--background-color);
                    border-radius: 4px;
                }
                
                .action-group {
                    padding: 0.5rem;
                }
                
                .button-group {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                }
                
                .file-upload {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                }
                
                .backups-section {
                    margin-top: 1rem;
                }
                
                .backups-list {
                    margin-top: 0.5rem;
                    max-height: 300px;
                    overflow-y: auto;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    padding: 0.5rem;
                }
                
                .backup-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem;
                    margin-bottom: 0.5rem;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background-color: white;
                }
                
                .backup-info {
                    flex-grow: 1;
                }
                
                .backup-name {
                    font-weight: bold;
                    margin-bottom: 0.25rem;
                }
                
                .backup-meta {
                    font-size: 0.85rem;
                    color: #666;
                }
                
                .backup-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .modal-body {
                    padding: 1rem;
                    max-height: 500px;
                    overflow-y: auto;
                }
            `;
            document.head.appendChild(styleElement);
            
            // Add event listeners
            this.addEventListeners();
        }
    }
    
    /**
     * Add event listeners for the database modal
     */
    addEventListeners() {
        // Create backup button
        document.getElementById('create-backup-btn').addEventListener('click', () => {
            this.createBackup();
        });
        
        // Export database button
        document.getElementById('export-db-btn').addEventListener('click', () => {
            this.exportDatabase();
        });
        
        // Import database button
        document.getElementById('import-db-btn').addEventListener('click', () => {
            this.importDatabase();
        });
        
        // Close modal button
        document.getElementById('close-db-modal-btn').addEventListener('click', () => {
            this.hideModal();
        });
        
        // Click outside modal to close
        document.getElementById('database-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('database-modal')) {
                this.hideModal();
            }
        });
        
        // Backups list event delegation for restore and delete buttons
        document.getElementById('backups-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-backup-btn')) {
                const backupFilename = e.target.closest('.backup-item').dataset.filename;
                this.restoreBackup(backupFilename);
            } else if (e.target.classList.contains('delete-backup-btn')) {
                const backupFilename = e.target.closest('.backup-item').dataset.filename;
                this.deleteBackup(backupFilename);
            }
        });
    }
    
    /**
     * Setup WebSocket message listeners
     */
    setupMessageListeners() {
        // Register message handlers
        this.app.registerMessageHandler('DATABASE_RESTORED', (message) => {
            this.app.showSystemMessage('INFO', 'Database has been restored. Refreshing data...');
            // Refresh data after database restore
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        });
        
        this.app.registerMessageHandler('DATABASE_IMPORTED', (message) => {
            this.app.showSystemMessage('INFO', 'Database has been imported. Refreshing data...');
            // Refresh data after database import
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        });
    }
    
    /**
     * Show the database management modal
     */
    showModal() {
        // Load backups list first
        this.loadBackups().then(() => {
            document.getElementById('database-modal').classList.remove('hidden');
        });
    }
    
    /**
     * Hide the database management modal
     */
    hideModal() {
        document.getElementById('database-modal').classList.add('hidden');
    }
    
    /**
     * Load the list of available backups
     */
    async loadBackups() {
        try {
            const response = await this.app.apiRequest('/api/database/backups');
            this.backups = response.backups;
            this.renderBackupsList();
        } catch (error) {
            console.error('Error loading backups:', error);
            this.app.showSystemMessage('ERROR', 'Failed to load database backups');
        }
    }
    
    /**
     * Render the list of backups
     */
    renderBackupsList() {
        const backupsList = document.getElementById('backups-list');
        
        if (!this.backups || this.backups.length === 0) {
            backupsList.innerHTML = '<p class="empty-message">No backups found.</p>';
            return;
        }
        
        backupsList.innerHTML = this.backups.map(backup => {
            // Format file size
            const fileSize = this.formatFileSize(backup.size);
            
            // Format date
            const date = new Date(backup.created);
            const formattedDate = date.toLocaleString();
            
            return `
                <div class="backup-item" data-filename="${backup.filename}">
                    <div class="backup-info">
                        <div class="backup-name">${backup.filename}</div>
                        <div class="backup-meta">
                            Created: ${formattedDate} | Size: ${fileSize}
                        </div>
                    </div>
                    <div class="backup-actions">
                        <button class="restore-backup-btn action-btn">Restore</button>
                        <button class="delete-backup-btn delete-btn">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Format file size in human-readable format
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Create a backup of the database
     */
    async createBackup() {
        try {
            const response = await this.app.apiRequest('/api/database/backup');
            this.app.showSystemMessage('INFO', `Backup created: ${response.filename}`);
            
            // Reload backups list
            await this.loadBackups();
        } catch (error) {
            console.error('Error creating backup:', error);
            this.app.showSystemMessage('ERROR', 'Failed to create database backup');
        }
    }
    
    /**
     * Export the database for download
     */
    exportDatabase() {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = '/api/database/export';
        link.download = `llm_orchestration_export_${new Date().toISOString().slice(0, 10)}.db`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.app.showSystemMessage('INFO', 'Database export started. Check your downloads folder.');
    }
    
    /**
     * Import a database from a file
     */
    async importDatabase() {
        const fileInput = document.getElementById('db-import-input');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            this.app.showSystemMessage('WARNING', 'Please select a database file to import');
            return;
        }
        
        const file = fileInput.files[0];
        
        // Verify it's a .db file
        if (!file.name.endsWith('.db')) {
            this.app.showSystemMessage('ERROR', 'Invalid file type. Please select a .db file');
            return;
        }
        
        // Confirm with user
        if (!confirm(
            'WARNING: Importing a database will replace your current data. ' + 
            'This action cannot be undone. ' + 
            'A backup of your current database will be created before importing. ' + 
            'Are you sure you want to continue?'
        )) {
            return;
        }
        
        try {
            // Create a FormData object
            const formData = new FormData();
            formData.append('file', file);
            
            // Show loading message
            this.app.showSystemMessage('INFO', 'Importing database. Please wait...');
            
            // Send file to server with fetch
            const response = await fetch('/api/database/import', {
                method: 'POST',
                body: file,
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            
            const result = await response.json();
            this.app.showSystemMessage('INFO', result.message);
            
            // Reset file input
            fileInput.value = '';
            
            // Hide modal
            this.hideModal();
            
            // Reload page after a delay to get fresh data
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error importing database:', error);
            this.app.showSystemMessage('ERROR', `Failed to import database: ${error.message}`);
        }
    }
    
    /**
     * Restore database from a backup
     */
    async restoreBackup(backupFilename) {
        // Confirm with user
        if (!confirm(
            'WARNING: Restoring a backup will replace your current data. ' + 
            'This action cannot be undone. ' + 
            'A backup of your current database will be created before restoring. ' + 
            'Are you sure you want to continue?'
        )) {
            return;
        }
        
        try {
            // Show loading message
            this.app.showSystemMessage('INFO', 'Restoring database from backup. Please wait...');
            
            const response = await this.app.apiRequest(`/api/database/restore/${backupFilename}`, 'POST');
            this.app.showSystemMessage('INFO', response.message);
            
            // Hide modal
            this.hideModal();
            
            // Reload page after a delay to get fresh data
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error restoring backup:', error);
            this.app.showSystemMessage('ERROR', `Failed to restore backup: ${error.message}`);
        }
    }
    
    /**
     * Delete a backup
     */
    async deleteBackup(backupFilename) {
        // Confirm with user
        if (!confirm(
            `Are you sure you want to delete the backup "${backupFilename}"? ` + 
            'This action cannot be undone.'
        )) {
            return;
        }
        
        try {
            await this.app.apiRequest(`/api/database/backups/${backupFilename}`, 'DELETE');
            this.app.showSystemMessage('INFO', `Backup "${backupFilename}" deleted`);
            
            // Reload backups list
            await this.loadBackups();
        } catch (error) {
            console.error('Error deleting backup:', error);
            this.app.showSystemMessage('ERROR', `Failed to delete backup: ${error.message}`);
        }
    }
}

// Export the DatabaseManager class
window.DatabaseManager = DatabaseManager;