/**
 * LLM Orchestration Application
 * Workflow management functionality
 */

class WorkflowManager {
    constructor(app) {
        this.app = app;
        this.workflows = new Map();
        this.selectedWorkflow = null;
        this.executionInProgress = false;
        this.executionStartTime = null;
        this.elapsedTimeInterval = null;
        
        // DOM elements
        this.workflowForm = document.getElementById('workflow-form');
        this.workflowList = document.getElementById('workflow-list-container');
        this.newWorkflowBtn = document.getElementById('new-workflow-btn');
        this.deleteWorkflowBtn = document.getElementById('delete-workflow-btn');
        this.executeWorkflowBtn = document.getElementById('execute-workflow-btn');
        this.addPayloadBtn = document.getElementById('add-workflow-payload-btn');
        this.workflowPayloads = document.getElementById('workflow-payloads');
        this.executionProgress = document.getElementById('execution-progress');
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Register for WebSocket messages
        if (this.app && this.app.registerMessageHandler) {
            this.app.registerMessageHandler('workflows', this.handleWebSocketMessage.bind(this));
        }
    }
    
    /**
     * Start the elapsed time counter
     */
    startElapsedTimeCounter() {
        // Stop any existing counter first
        this.stopElapsedTimeCounter();
        
        // Store the start time
        this.executionStartTime = new Date();
        
        // Update the start time display
        const startTimeElement = document.getElementById('execution-start-time');
        if (startTimeElement) {
            startTimeElement.textContent = this.executionStartTime.toLocaleTimeString();
        }
        
        // Set up an interval to update the elapsed time every second
        this.elapsedTimeInterval = setInterval(() => {
            if (!this.executionStartTime) return;
            
            const elapsedElement = document.getElementById('execution-elapsed-time');
            if (elapsedElement) {
                const now = new Date();
                const elapsedSeconds = Math.round((now - this.executionStartTime) / 1000);
                elapsedElement.textContent = `${elapsedSeconds}s`;
            }
        }, 1000);
    }
    
    /**
     * Stop the elapsed time counter
     */
    stopElapsedTimeCounter() {
        if (this.elapsedTimeInterval) {
            clearInterval(this.elapsedTimeInterval);
            this.elapsedTimeInterval = null;
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // New workflow button
        if (this.newWorkflowBtn) {
            this.newWorkflowBtn.addEventListener('click', () => {
                this.selectWorkflow(null);
            });
        }
        
        // Delete workflow button
        if (this.deleteWorkflowBtn) {
            this.deleteWorkflowBtn.addEventListener('click', () => {
                this.deleteSelectedWorkflow();
            });
        }
        
        // Execute workflow button
        if (this.executeWorkflowBtn) {
            this.executeWorkflowBtn.addEventListener('click', () => {
                this.executeWorkflow();
            });
        }
        
        // Add payload button
        if (this.addPayloadBtn) {
            this.addPayloadBtn.addEventListener('click', () => {
                this.showPayloadSelector();
            });
        }
        
        // Workflow form submission
        if (this.workflowForm) {
            this.workflowForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveWorkflow();
            });
        }
        
        // Load workflows when tab is selected
        document.querySelector('[data-tab="workflows"]').addEventListener('click', () => {
            this.loadWorkflows();
        });
    }
    
    /**
     * Load workflows from server
     */
    async loadWorkflows() {
        try {
            const workflows = await this.app.apiRequest('/api/workflows');
            
            // Store workflows in memory
            this.workflows = new Map();
            workflows.forEach(workflow => {
                this.workflows.set(workflow.id, workflow);
            });
            
            // Update UI
            this.updateWorkflowList();
            
            this.app.showSystemMessage('INFO', `Loaded ${workflows.length} workflows`);
        } catch (error) {
            console.error('Failed to load workflows:', error);
        }
    }

    /**
     * Update workflow list in UI
     */
    updateWorkflowList() {
        if (!this.workflowList) return;
        
        // Clear current list
        this.workflowList.innerHTML = '';
        
        // If no workflows, show empty message
        if (!this.workflows || this.workflows.size === 0) {
            const emptyElement = document.createElement('div');
            emptyElement.className = 'empty-message';
            emptyElement.textContent = 'No workflows found. Create a new workflow to get started.';
            this.workflowList.appendChild(emptyElement);
            return;
        }
        
        // Sort workflows by name
        const sortedWorkflows = Array.from(this.workflows.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        
        // Create list items for each workflow
        sortedWorkflows.forEach(workflow => {
            const workflowItem = document.createElement('div');
            workflowItem.className = 'workflow-item';
            if (this.selectedWorkflow && this.selectedWorkflow.id === workflow.id) {
                workflowItem.classList.add('selected');
            }
            
            workflowItem.innerHTML = `
                <div class="workflow-item-name">${workflow.name}</div>
                <div class="workflow-item-info">${workflow.payloads.length} payloads</div>
            `;
            
            workflowItem.addEventListener('click', () => {
                this.selectWorkflow(workflow);
            });
            
            this.workflowList.appendChild(workflowItem);
        });
    }

    /**
     * Handle WebSocket messages related to workflows
     * @param {Object} message - The WebSocket message
     */
    handleWebSocketMessage(message) {
        if (!message || !message.type) return;
        
        switch (message.type) {
            case 'WORKFLOW_CREATED':
                if (message.workflow) {
                    this.workflows.set(message.workflow.id, message.workflow);
                    this.updateWorkflowList();
                }
                break;
                
            case 'execution_progress':
                this.updateExecutionProgress(message);
                break;
                
            case 'payload_completed':
                // Update progress after payload completion
                if (message.data) {
                    this.updateExecutionProgress({
                        type: 'execution_progress',
                        data: {
                            ...message.data,
                            status: 'Completed'
                        }
                    });
                    // Show completion message
                    this.app.showSystemMessage('INFO', `Payload "${message.data.payloadName}" completed`);
                }
                break;
                
            case 'workflow_completed':
                // Send final progress update
                this.updateExecutionProgress({
                    type: 'execution_progress',
                    data: {
                        progress: 100,
                        status: 'Completed',
                        payloadName: 'All payloads completed'
                    }
                });
                
                // Remove any existing success messages first
                const successMessages = this.executionProgress.querySelectorAll('div');
                successMessages.forEach(msg => {
                    if (msg.textContent && msg.textContent.includes('Workflow execution completed successfully')) {
                        this.executionProgress.removeChild(msg);
                    }
                });
                
                // Add completion message
                this.executionComplete({
                    status: 'success',
                    message: 'Workflow execution completed successfully'
                });
                this.app.showSystemMessage('SUCCESS', 'Workflow execution completed successfully');
                break;
                
            case 'workflow_failed':
                this.executionComplete({
                    status: 'error',
                    message: message.data?.error || 'Workflow execution failed'
                });
                this.app.showSystemMessage('ERROR', `Workflow execution failed: ${message.data?.error || 'Unknown error'}`);
                break;
                
            case 'WORKFLOW_UPDATED':
                if (message.workflow) {
                    this.workflows.set(message.workflow.id, message.workflow);
                    this.updateWorkflowList();
                    
                    // If this is the currently selected workflow, update form
                    if (this.selectedWorkflow && this.selectedWorkflow.id === message.workflow.id) {
                        this.selectWorkflow(message.workflow);
                    }
                }
                break;
                
            case 'WORKFLOW_DELETED':
                if (message.workflowId) {
                    this.workflows.delete(message.workflowId);
                    this.updateWorkflowList();
                    
                    // If this was the selected workflow, clear form
                    if (this.selectedWorkflow && this.selectedWorkflow.id === message.workflowId) {
                        this.selectWorkflow(null);
                    }
                }
                break;
        }
    }
    
    /**
     * Select a workflow to edit or create new if null
     * @param {Object|null} workflow - The workflow to select or null for new
     */
    selectWorkflow(workflow) {
        this.selectedWorkflow = workflow;
        
        // Update form fields
        if (this.workflowForm) {
            const nameInput = this.workflowForm.querySelector('#workflow-name');
            if (nameInput) {
                nameInput.value = workflow ? workflow.name : '';
            }
            
            // Update workflow payloads list
            this.updatePayloadsList();
            
            // Update button states
            if (this.deleteWorkflowBtn) {
                this.deleteWorkflowBtn.disabled = !workflow;
            }
            
            if (this.executeWorkflowBtn) {
                this.executeWorkflowBtn.disabled = !workflow || this.executionInProgress;
            }
        }
        
        // Update selected item in list
        this.updateWorkflowList();
    }
    
    /**
     * Update the payloads list in the workflow form
     */
    updatePayloadsList() {
        if (!this.workflowPayloads) return;
        
        // Clear current list
        this.workflowPayloads.innerHTML = '';
        
        // If no workflow selected or no payloads, show empty message
        if (!this.selectedWorkflow || !this.selectedWorkflow.payloads || this.selectedWorkflow.payloads.length === 0) {
            const emptyElement = document.createElement('div');
            emptyElement.className = 'empty-message';
            emptyElement.textContent = 'No payloads added. Add payloads to create a workflow.';
            this.workflowPayloads.appendChild(emptyElement);
            return;
        }
        
        // Create list items for each payload
        this.selectedWorkflow.payloads.forEach((payload, index) => {
            const payloadItem = document.createElement('div');
            payloadItem.className = 'workflow-payload-item';
            
            payloadItem.innerHTML = `
                <div class="payload-name">${payload.name}</div>
                <div class="payload-actions">
                    <button type="button" class="move-up-btn" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="move-down-btn" ${index === this.selectedWorkflow.payloads.length - 1 ? 'disabled' : ''}>↓</button>
                    <button type="button" class="remove-btn">×</button>
                </div>
            `;
            
            // Add event listeners for buttons
            const moveUpBtn = payloadItem.querySelector('.move-up-btn');
            const moveDownBtn = payloadItem.querySelector('.move-down-btn');
            const removeBtn = payloadItem.querySelector('.remove-btn');
            
            if (moveUpBtn) {
                moveUpBtn.addEventListener('click', () => {
                    this.movePayload(index, -1);
                });
            }
            
            if (moveDownBtn) {
                moveDownBtn.addEventListener('click', () => {
                    this.movePayload(index, 1);
                });
            }
            
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    this.removePayload(index);
                });
            }
            
            this.workflowPayloads.appendChild(payloadItem);
        });
    }
    
    /**
     * Move a payload up or down in the workflow
     * @param {number} index - The current index of the payload
     * @param {number} direction - -1 for up, 1 for down
     */
    movePayload(index, direction) {
        if (!this.selectedWorkflow || !this.selectedWorkflow.payloads) return;
        
        const newIndex = index + direction;
        
        // Check if new index is valid
        if (newIndex < 0 || newIndex >= this.selectedWorkflow.payloads.length) return;
        
        // Swap payloads
        const temp = this.selectedWorkflow.payloads[index];
        this.selectedWorkflow.payloads[index] = this.selectedWorkflow.payloads[newIndex];
        this.selectedWorkflow.payloads[newIndex] = temp;
        
        // Update UI
        this.updatePayloadsList();
    }
    
    /**
     * Remove a payload from the workflow
     * @param {number} index - The index of the payload to remove
     */
    removePayload(index) {
        if (!this.selectedWorkflow || !this.selectedWorkflow.payloads) return;
        
        // Remove payload at index
        this.selectedWorkflow.payloads.splice(index, 1);
        
        // Update UI
        this.updatePayloadsList();
    }
    
    /**
     * Show payload selector modal
     */
    async showPayloadSelector() {
        // Fetch available payloads
        try {
            const payloads = await this.app.apiRequest('/api/payloads');
            
            // Filter out payloads already in the workflow
            const availablePayloads = payloads.filter(payload => {
                if (!this.selectedWorkflow || !this.selectedWorkflow.payloads) return true;
                return !this.selectedWorkflow.payloads.some(p => p.id === payload.id);
            });
            
            if (availablePayloads.length === 0) {
                this.app.showSystemMessage('INFO', 'No more payloads available to add');
                return;
            }
            
            // Show modal with payload selection
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Select Payload</h3>
                        <button type="button" class="close-btn">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="payload-list">
                            ${availablePayloads.map(payload => `
                                <div class="payload-item" data-id="${payload.id}">
                                    <div class="payload-name">${payload.name}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const closeBtn = modal.querySelector('.close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                });
            }
            
            const payloadItems = modal.querySelectorAll('.payload-item');
            payloadItems.forEach(item => {
                item.addEventListener('click', () => {
                    const payloadId = parseInt(item.getAttribute('data-id'));
                    const payload = payloads.find(p => p.id === payloadId);
                    
                    if (payload) {
                        this.addPayload(payload);
                    }
                    
                    document.body.removeChild(modal);
                });
            });
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('Failed to load payloads:', error);
            this.app.showSystemMessage('ERROR', 'Failed to load available payloads');
        }
    }
    
    /**
     * Add a payload to the workflow
     * @param {Object} payload - The payload to add
     */
    addPayload(payload) {
        if (!this.selectedWorkflow) {
            // Create new workflow if none selected
            this.selectedWorkflow = {
                name: '',
                payloads: []
            };
        }
        
        // Initialize payloads array if it doesn't exist
        if (!this.selectedWorkflow.payloads) {
            this.selectedWorkflow.payloads = [];
        }
        
        // Add payload to the list
        this.selectedWorkflow.payloads.push(payload);
        
        // Update UI
        this.updatePayloadsList();
    }
    
    /**
     * Save current workflow (create or update)
     */
    async saveWorkflow() {
        try {
            const nameInput = this.workflowForm.querySelector('#workflow-name');
            if (!nameInput || !nameInput.value.trim()) {
                this.app.showSystemMessage('ERROR', 'Workflow name is required');
                return;
            }
            
            // Validate workflow has payloads
            if (!this.selectedWorkflow || !this.selectedWorkflow.payloads || this.selectedWorkflow.payloads.length === 0) {
                this.app.showSystemMessage('ERROR', 'Workflow must have at least one payload');
                return;
            }
            
            const workflowData = {
                name: nameInput.value.trim(),
                payloads: this.selectedWorkflow.payloads.map(p => p.id)
            };
            
            let response;
            
            // Create or update workflow
            if (this.selectedWorkflow.id) {
                // Update existing workflow
                response = await this.app.apiRequest(`/api/workflows/${this.selectedWorkflow.id}`, 'PUT', workflowData);
                this.app.showSystemMessage('SUCCESS', `Workflow "${workflowData.name}" updated`);
            } else {
                // Create new workflow
                response = await this.app.apiRequest('/api/workflows', 'POST', workflowData);
                this.app.showSystemMessage('SUCCESS', `Workflow "${workflowData.name}" created`);
            }
            
            // Update with saved workflow
            if (response) {
                this.workflows.set(response.id, response);
                this.selectWorkflow(response);
                this.updateWorkflowList();
            }
        } catch (error) {
            console.error('Error saving workflow:', error);
            this.app.showSystemMessage('ERROR', `Failed to save workflow: ${error.message || 'Unknown error'}`);
        }
    }
    
    /**
     * Delete the currently selected workflow
     */
    async deleteSelectedWorkflow() {
        if (!this.selectedWorkflow || !this.selectedWorkflow.id) {
            this.app.showSystemMessage('ERROR', 'No workflow selected');
            return;
        }
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete the workflow "${this.selectedWorkflow.name}"?`)) {
            return;
        }
        
        try {
            await this.app.apiRequest(`/api/workflows/${this.selectedWorkflow.id}`, 'DELETE');
            
            this.workflows.delete(this.selectedWorkflow.id);
            this.selectWorkflow(null);
            this.updateWorkflowList();
            
            this.app.showSystemMessage('SUCCESS', 'Workflow deleted');
        } catch (error) {
            console.error('Error deleting workflow:', error);
            this.app.showSystemMessage('ERROR', `Failed to delete workflow: ${error.message || 'Unknown error'}`);
        }
    }
    
    /**
     * Execute the currently selected workflow
     */
    async executeWorkflow() {
        if (!this.selectedWorkflow || !this.selectedWorkflow.id) {
            this.app.showSystemMessage('ERROR', 'No workflow selected');
            return;
        }
        
        if (this.executionInProgress) {
            this.app.showSystemMessage('INFO', 'Execution already in progress');
            return;
        }
        
        try {
            // Mark execution as in progress
            this.executionInProgress = true;
            
            // Disable execute button
            if (this.executeWorkflowBtn) {
                this.executeWorkflowBtn.disabled = true;
            }
            
            // Show and reset progress bar
            if (this.executionProgress) {
                // First, remove any non-structural elements (clean slate)
                const childElements = Array.from(this.executionProgress.childNodes);
                const structuralElements = ['progress-container', 'current-status', 'execution-stats'];
                
                childElements.forEach(node => {
                    // Keep heading and structured elements, remove others
                    if (node.nodeType === 1) { // Element node
                        const isStructural = structuralElements.some(cls => 
                            node.classList && node.classList.contains(cls));
                        const isHeading = node.tagName === 'H3';
                        
                        if (!isStructural && !isHeading) {
                            this.executionProgress.removeChild(node);
                        }
                    }
                });
                
                this.executionProgress.classList.remove('hidden');
                const progressFill = this.executionProgress.querySelector('.progress-fill');
                const progressStatus = this.executionProgress.querySelector('.progress-status');
                if (progressFill) progressFill.style.width = '0%';
                if (progressStatus) progressStatus.textContent = '0%';
                
                // Reset status fields
                document.getElementById('current-payload-name').textContent = 'Starting...';
                document.getElementById('execution-status').textContent = 'Running';
                document.getElementById('execution-elapsed-time').textContent = '0s';
                document.getElementById('execution-tokens-per-second').textContent = '-';
                
                // Start the elapsed time counter
                this.startElapsedTimeCounter();
            }
            
            this.app.showSystemMessage('INFO', `Executing workflow "${this.selectedWorkflow.name}"...`);
            
            // Make API request to execute workflow
            const response = await this.app.apiRequest(`/api/execute/workflow/${this.selectedWorkflow.id}`, 'POST');
            
            // Handle response (expected to be a runId or similar)
            if (response && response.message) {
                this.app.showSystemMessage('SUCCESS', response.message);
            }
        } catch (error) {
            console.error('Error executing workflow:', error);
            this.app.showSystemMessage('ERROR', `Failed to execute workflow: ${error.message || 'Unknown error'}`);
            
            // Reset execution state
            this.executionInProgress = false;
            
            if (this.executeWorkflowBtn) {
                this.executeWorkflowBtn.disabled = false;
            }
            
            if (this.executionProgress) {
                this.executionProgress.classList.add('hidden');
            }
            
            // Stop the elapsed time counter
            this.stopElapsedTimeCounter();
        }
    }
    
    /**
     * Update workflow execution progress based on WebSocket message
     * @param {Object} message - The WebSocket message containing progress info
     */
    updateExecutionProgress(message) {
        if (!this.executionProgress) return;
        
        const progressData = message.data || message;
        
        // Update progress bar
        const progressFill = this.executionProgress.querySelector('.progress-fill');
        const progressStatus = this.executionProgress.querySelector('.progress-status');
        if (progressFill && progressData.progress !== undefined) {
            progressFill.style.width = `${progressData.progress}%`;
        }
        if (progressStatus && progressData.progress !== undefined) {
            progressStatus.textContent = `${Math.round(progressData.progress)}%`;
        }
        
        // Update current payload name
        const currentPayloadName = document.getElementById('current-payload-name');
        if (currentPayloadName && progressData.payloadName) {
            currentPayloadName.textContent = progressData.payloadName;
        }
        
        // Update execution status
        const executionStatus = document.getElementById('execution-status');
        if (executionStatus && progressData.status) {
            executionStatus.textContent = progressData.status;
        }
        
        // Update tokens per second if available
        const tokensPerSecond = document.getElementById('execution-tokens-per-second');
        if (tokensPerSecond && progressData.metadata?.tokens_per_second) {
            tokensPerSecond.textContent = Math.round(progressData.metadata.tokens_per_second);
        }
    }
    
    /**
     * Handle workflow execution complete
     * @param {Object} message - The WebSocket message
     */
    executionComplete(message) {
        // Reset execution state
        this.executionInProgress = false;
        
        // Stop the elapsed time counter
        this.stopElapsedTimeCounter();
        
        if (this.executeWorkflowBtn) {
            this.executeWorkflowBtn.disabled = false;
        }
        
        // Update UI
        if (this.executionProgress) {
            // Update final status
            const executionStatus = document.getElementById('execution-status');
            if (executionStatus) {
                executionStatus.textContent = message.status === 'success' ? 'Completed' : 'Failed';
            }
            
            // First, find and remove any messages that match 'workflow execution completed successfully'
            const allNodes = Array.from(this.executionProgress.childNodes);
            allNodes.forEach(node => {
                // Check text content of any node or its children to remove message
                if (node.textContent && node.textContent.includes('Workflow execution completed successfully')) {
                    this.executionProgress.removeChild(node);
                }
            });
            
            // Add completion message, but only if one doesn't already exist
            const simpleCompletionMessage = document.createElement('div');
            simpleCompletionMessage.style.marginTop = '10px';
            simpleCompletionMessage.style.fontWeight = 'bold';
            
            if (message.status === 'success') {
                simpleCompletionMessage.style.color = 'var(--success-color)';
                simpleCompletionMessage.textContent = 'Workflow execution completed successfully';
            } else {
                simpleCompletionMessage.style.color = 'var(--error-color)';
                simpleCompletionMessage.textContent = message.message || 'Workflow execution failed';
            }
            
            this.executionProgress.appendChild(simpleCompletionMessage);
            this.executionProgress.scrollTop = this.executionProgress.scrollHeight;
        }
    }
}

// Export the WorkflowManager class
if (typeof window !== 'undefined') {
    // Browser environment
    window.WorkflowManager = WorkflowManager;
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = WorkflowManager;
}