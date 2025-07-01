/**
 * Runs Manager - Handles the display and interaction with workflow runs and responses
 */
class RunsManager {
    constructor(app) {
        this.app = app;
        this.runs = [];
        this.currentRun = null;
        
        // Initialize UI elements
        this.initUI();
        
        // Register WebSocket message handlers
        this.registerMessageHandlers();
    }
    
    /**
     * Format model information for display
     * @param {Object} modelInfo - The model information
     * @returns {string} - Formatted model information
     */
    formatModelInfo(modelInfo) {
        if (!modelInfo) return 'Unknown';
        
        // Handle Kobold API format
        if (modelInfo.model) {
            return modelInfo.model;
        }
        
        // Handle OpenAI API format
        if (modelInfo.data && Array.isArray(modelInfo.data) && modelInfo.data.length > 0) {
            return modelInfo.data[0].id || 'local-model';
        }
        
        // Handle basic format
        if (modelInfo.message && modelInfo.port) {
            return `Server on port ${modelInfo.port}`;
        }
        
        // Return a default if we can't parse the model info
        return JSON.stringify(modelInfo);
    }
    
    /**
     * Initialize UI elements
     */
    initUI() {
        // Only initialize elements if we're in the runs tab
        if (this.app.state.activeTab !== 'runs') {
            return; // Don't initialize if not in runs tab
        }
        
        // Get DOM elements
        this.runsList = document.getElementById('runs-list');
        this.runDetails = document.getElementById('run-details');
        this.responseList = document.getElementById('response-list');
        
        // Don't add event listeners if elements don't exist
        if (!this.runsList) return;
        
        // Add event listeners
        this.runsList.addEventListener('click', (e) => {
            const runItem = e.target.closest('.run-item');
            if (runItem) {
                const runId = runItem.dataset.runId;
                if (e.target.classList.contains('delete-btn')) {
                    e.stopPropagation(); // Prevent run selection when clicking delete
                    this.deleteRun(runId);
                } else {
                    this.loadRunDetails(runId);
                }
            }
        });
    }
    
    /**
     * Handle run deletion messages from WebSocket
     * This is a failsafe method that can be called directly if needed
     */
    handleRunDeleted(message) {
        console.log('RunsManager handling run deletion:', message);
        const runId = message.data?.id || message.id;
        if (!runId) {
            console.error('Invalid RUN_DELETED message format:', message);
            return;
        }
        
        const numericRunId = parseInt(runId, 10);
        
        // Remove run from local array
        this.runs = this.runs.filter(run => run.id !== numericRunId && run.id !== runId);
        
        // Clear details if the deleted run was selected
        if (this.currentRun && (this.currentRun.id === numericRunId || this.currentRun.id === runId)) {
            this.currentRun = null;
            if (this.runDetails) this.runDetails.innerHTML = '';
            if (this.responseList) this.responseList.innerHTML = '';
        }
        
        // Force an update of the UI if in runs tab
        if (this.app.state.activeTab === 'runs' && this.runsList) {
            this.renderRunsList();
        }
    }
    
    /**
     * Delete a run
     */
    async deleteRun(runId) {
        if (!confirm('Are you sure you want to delete this run? This action cannot be undone.')) {
            return;
        }
        
        try {
            await this.app.apiRequest(`/api/runs/${runId}`, 'DELETE');
            
            // Convert runId to number for consistent comparison
            const numericRunId = parseInt(runId, 10);
            
            // Remove run from local array
            this.runs = this.runs.filter(run => run.id !== numericRunId && run.id !== runId);
            
            // Clear details if the deleted run was selected
            if (this.currentRun && (this.currentRun.id === numericRunId || this.currentRun.id === runId)) {
                this.currentRun = null;
                this.runDetails.innerHTML = '';
                this.responseList.innerHTML = '';
            }
            
            // Update the runs list
            this.renderRunsList();
            
            this.app.showSystemMessage('info', 'Run deleted successfully');
        } catch (error) {
            console.error('Error deleting run:', error);
            this.app.showSystemMessage('error', 'Failed to delete run');
        }
    }
    
    /**
     * Register WebSocket message handlers
     */
    registerMessageHandlers() {
        this.app.registerMessageHandler('execution_progress', (message) => {
            this.handleExecutionProgress(message.data);
        });
        
        this.app.registerMessageHandler('payload_completed', (message) => {
            this.handlePayloadCompleted(message.data);
        });
        
        this.app.registerMessageHandler('workflow_completed', (message) => {
            this.handleWorkflowCompleted(message.data);
        });
        
        this.app.registerMessageHandler('workflow_failed', (message) => {
            this.handleWorkflowFailed(message.data);
        });
        
        this.app.registerMessageHandler('RUN_DELETED', (message) => {
            console.log('Received RUN_DELETED message:', message);
            const runId = message.data?.id || message.id;
            const numericRunId = parseInt(runId, 10);
            
            // Remove run from local array, handle both string and number types
            this.runs = this.runs.filter(run => run.id !== numericRunId && run.id !== runId);
            
            // Clear details if the deleted run was selected
            if (this.currentRun && (this.currentRun.id === numericRunId || this.currentRun.id === runId)) {
                this.currentRun = null;
                this.runDetails.innerHTML = '';
                this.responseList.innerHTML = '';
            }
            
            // Force an update of the UI if in runs tab
            if (this.app.state.activeTab === 'runs') {
                this.renderRunsList();
            }
        });
    }
    
    /**
     * Load and display all runs
     */
    async loadRuns() {
        try {
            const response = await this.app.apiRequest('/api/runs');
            this.runs = response;
            this.renderRunsList();
        } catch (error) {
            console.error('Error loading runs:', error);
            this.app.showSystemMessage('error', 'Failed to load runs');
        }
    }
    
    /**
     * Load and display details for a specific run
     */
    async loadRunDetails(runId) {
        try {
            const response = await this.app.apiRequest(`/api/runs/${runId}`);
            this.currentRun = response;
            if (this.app.state.activeTab === 'runs') {
                this.renderRunDetails();
            }
        } catch (error) {
            console.error('Error loading run details:', error);
            this.app.showSystemMessage('error', 'Failed to load run details');
        }
    }
    
    /**
     * Render the list of runs
     */
    renderRunsList() {
        // Only render when the runs tab is active
        if (this.app.state.activeTab !== 'runs' || !this.runsList) {
            return;
        }
        
        // Force re-render even if runs is empty
        if (this.runs.length === 0) {
            this.runsList.innerHTML = '<div class="empty-message">No runs found</div>';
            return;
        }
        
        this.runsList.innerHTML = this.runs.map(run => `
            <div class="run-item ${run.status}" data-run-id="${run.id}">
                <div class="run-header">
                    <h3>${run.workflow_name || 'Unnamed Workflow'}</h3>
                    <div class="run-actions">
                        <span class="run-status ${run.status}">${run.status}</span>
                        <button class="delete-btn" title="Delete run">×</button>
                    </div>
                </div>
                <div class="run-meta">
                    <span>Started: ${new Date(run.started_at).toLocaleString()}</span>
                    ${run.completed_at ? `<span>Completed: ${new Date(run.completed_at).toLocaleString()}</span>` : ''}
                    <span>Responses: ${run.response_count || 0}</span>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Render the details of a specific run
     */
    renderRunDetails() {
        if (!this.currentRun || this.app.state.activeTab !== 'runs' || !this.runDetails || !this.responseList) return;
        
        // Extract model info from metadata if available
        let modelInfoDisplay = '';
        if (this.currentRun.metadata && this.currentRun.metadata.models && this.currentRun.metadata.models.length > 0) {
            const models = this.currentRun.metadata.models;
            modelInfoDisplay = `
                <div class="model-info-section">
                    <h3>Model Information</h3>
                    <ul class="model-list">
                        ${models.map(model => `
                            <li>
                                <strong>${model.payloadName}:</strong> ${this.formatModelInfo(model.modelInfo)}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Update run details section
        this.runDetails.innerHTML = `
            <div class="run-info">
                <div class="run-title-section">
                    <h2>${this.currentRun.workflow_name || 'Unnamed Workflow'}</h2>
                    <div class="run-status ${this.currentRun.status}">${this.currentRun.status}</div>
                </div>
                <div class="response-controls">
                    <button id="toggle-all-responses" class="secondary-btn">Expand All</button>
                </div>
                <div class="run-meta">
                    <p>Started: ${new Date(this.currentRun.started_at).toLocaleString()}</p>
                    ${this.currentRun.completed_at ? 
                        `<p>Completed: ${new Date(this.currentRun.completed_at).toLocaleString()}</p>` : ''}
                    ${modelInfoDisplay}
                </div>
            </div>
        `;
        
        // Update responses section
        this.responseList.innerHTML = this.currentRun.responses.map(response => `
            <div class="response-item">
                <div class="response-header" data-response-id="${response.id || ''}">
                    <div class="response-title">
                        <span class="collapse-icon collapsed">▼</span>
                        <h3>${response.payload_name || 'Unnamed Payload'}</h3>
                    </div>
                    <div class="response-actions">
                        <span class="response-time">
                            ${response.metadata?.duration_ms ? 
                                `Duration: ${(response.metadata.duration_ms / 1000).toFixed(2)}s` : ''}
                        </span>
                        <button class="copy-button" data-response-id="${response.id || ''}">Copy</button>
                    </div>
                </div>
                <div class="response-content collapsed">
                    <pre>${response.content}</pre>
                </div>
                ${response.metadata ? `
                    <div class="response-meta collapsed">
                        <span>Tokens: ${response.metadata.tokens || 0}</span>
                        <span>Tokens/sec: ${response.metadata.tokens_per_second || 0}</span>
                        ${response.metadata.model_info ? `
                        <span class="model-info">
                            Model: ${this.formatModelInfo(response.metadata.model_info)}
                        </span>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // Add event listeners to response headers for collapsing/expanding
        document.querySelectorAll('#runs-tab .response-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking on the copy button
                if (e.target.classList.contains('copy-button')) return;
                
                const responseItem = header.closest('.response-item');
                const content = responseItem.querySelector('.response-content');
                const meta = responseItem.querySelector('.response-meta');
                const icon = header.querySelector('.collapse-icon');
                
                content.classList.toggle('collapsed');
                if (meta) meta.classList.toggle('collapsed');
                icon.classList.toggle('collapsed');
            });
        });
        
        // Add event listeners to copy buttons
        document.querySelectorAll('#runs-tab .copy-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent response toggle
                
                const responseItem = button.closest('.response-item');
                const content = responseItem.querySelector('.response-content pre').textContent;
                
                // Copy to clipboard
                navigator.clipboard.writeText(content)
                    .then(() => {
                        const originalText = button.textContent;
                        button.textContent = 'Copied!';
                        setTimeout(() => {
                            button.textContent = originalText;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy text: ', err);
                        this.app.showSystemMessage('error', 'Failed to copy text to clipboard');
                    });
            });
        });
        
        // Add event listener to the toggle-all button
        const toggleAllBtn = document.getElementById('toggle-all-responses');
        if (toggleAllBtn) {
            toggleAllBtn.addEventListener('click', () => {
                const allContents = document.querySelectorAll('#runs-tab .response-content');
                const allMetas = document.querySelectorAll('#runs-tab .response-meta');
                const allIcons = document.querySelectorAll('#runs-tab .collapse-icon');
                
                // Check if we're expanding or collapsing
                const isExpanding = toggleAllBtn.textContent === 'Expand All';
                
                // Update all responses
                allContents.forEach(content => {
                    if (isExpanding) {
                        content.classList.remove('collapsed');
                    } else {
                        content.classList.add('collapsed');
                    }
                });
                
                allMetas.forEach(meta => {
                    if (isExpanding) {
                        meta.classList.remove('collapsed');
                    } else {
                        meta.classList.add('collapsed');
                    }
                });
                
                allIcons.forEach(icon => {
                    if (isExpanding) {
                        icon.classList.remove('collapsed');
                    } else {
                        icon.classList.add('collapsed');
                    }
                });
                
                // Update button text
                toggleAllBtn.textContent = isExpanding ? 'Collapse All' : 'Expand All';
            });
        }
    }
    
    /**
     * Handle execution progress updates
     */
    handleExecutionProgress(data) {
        const run = this.runs.find(r => r.id === data.runId);
        if (run) {
            run.status = 'running';
            if (this.app.state.activeTab === 'runs') {
                this.renderRunsList();
            }
        }
    }
    
    /**
     * Handle payload completion updates
     */
    handlePayloadCompleted(data) {
        if (this.currentRun && this.currentRun.id === data.runId) {
            // Add new response to current run
            const newResponse = {
                payload_id: data.payloadId,
                payload_name: data.payloadName,
                content: data.content,
                metadata: data.metadata,
                id: Date.now() // Use timestamp as temporary ID
            };
            
            this.currentRun.responses.push(newResponse);
            
            if (this.app.state.activeTab === 'runs') {
                // Instead of re-rendering the entire list, append the new response
                const responseItem = document.createElement('div');
                responseItem.className = 'response-item';
                responseItem.innerHTML = `
                    <div class="response-header" data-response-id="${newResponse.id || ''}">
                        <div class="response-title">
                            <span class="collapse-icon collapsed">▼</span>
                            <h3>${newResponse.payload_name || 'Unnamed Payload'}</h3>
                        </div>
                        <div class="response-actions">
                            <span class="response-time">
                                ${newResponse.metadata?.duration_ms ? 
                                    `Duration: ${(newResponse.metadata.duration_ms / 1000).toFixed(2)}s` : ''}
                            </span>
                            <button class="copy-button" data-response-id="${newResponse.id || ''}">Copy</button>
                        </div>
                    </div>
                    <div class="response-content collapsed">
                        <pre>${newResponse.content}</pre>
                    </div>
                    ${newResponse.metadata ? `
                        <div class="response-meta collapsed">
                            <span>Tokens: ${newResponse.metadata.tokens || 0}</span>
                            <span>Tokens/sec: ${newResponse.metadata.tokens_per_second || 0}</span>
                            ${newResponse.metadata.model_info ? `
                            <span class="model-info">
                                Model: ${this.formatModelInfo(newResponse.metadata.model_info)}
                            </span>` : ''}
                        </div>
                    ` : ''}
                `;
                
                // Add to the DOM
                this.responseList.appendChild(responseItem);
                
                // Add event listeners to the new response header for collapsing/expanding
                const header = responseItem.querySelector('.response-header');
                header.addEventListener('click', (e) => {
                    // Don't toggle if clicking on the copy button
                    if (e.target.classList.contains('copy-button')) return;
                    
                    const content = responseItem.querySelector('.response-content');
                    const meta = responseItem.querySelector('.response-meta');
                    const icon = header.querySelector('.collapse-icon');
                    
                    content.classList.toggle('collapsed');
                    if (meta) meta.classList.toggle('collapsed');
                    icon.classList.toggle('collapsed');
                });
                
                // Add event listener to the new copy button
                const copyButton = responseItem.querySelector('.copy-button');
                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent response toggle
                    
                    const content = responseItem.querySelector('.response-content pre').textContent;
                    
                    // Copy to clipboard
                    navigator.clipboard.writeText(content)
                        .then(() => {
                            const originalText = copyButton.textContent;
                            copyButton.textContent = 'Copied!';
                            setTimeout(() => {
                                copyButton.textContent = originalText;
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Failed to copy text: ', err);
                            this.app.showSystemMessage('error', 'Failed to copy text to clipboard');
                        });
                });
            }
        }
    }
    
    /**
     * Handle workflow completion updates
     */
    handleWorkflowCompleted(data) {
        const run = this.runs.find(r => r.id === data.runId);
        if (run) {
            run.status = 'completed';
            run.completed_at = new Date().toISOString();
            if (this.app.state.activeTab === 'runs') {
                this.renderRunsList();
            }
        }
        
        if (this.currentRun && this.currentRun.id === data.runId) {
            this.currentRun.status = 'completed';
            this.currentRun.completed_at = new Date().toISOString();
            if (this.app.state.activeTab === 'runs') {
                this.renderRunDetails();
            }
        }
    }
    
    /**
     * Handle workflow failure updates
     */
    handleWorkflowFailed(data) {
        const run = this.runs.find(r => r.id === data.runId);
        if (run) {
            run.status = 'failed';
            run.completed_at = new Date().toISOString();
            if (this.app.state.activeTab === 'runs') {
                this.renderRunsList();
            }
        }
        
        if (this.currentRun && this.currentRun.id === data.runId) {
            this.currentRun.status = 'failed';
            this.currentRun.completed_at = new Date().toISOString();
            if (this.app.state.activeTab === 'runs') {
                this.renderRunDetails();
            }
        }
        
        this.app.showSystemMessage('error', `Workflow failed: ${data.error}`);
    }
}

// Export the RunsManager class
window.RunsManager = RunsManager;