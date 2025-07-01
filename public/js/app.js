/**
 * LLM Orchestration Application
 * Main application logic
 */

class App {
    constructor() {
        this.state = {
            activeTab: 'blocks',
            systemMessages: []
        };
        
        // Initialize tab navigation
        this.initTabs();
        
        // Initialize WebSocket connection for real-time updates
        this.initWebSocket();
        
        // Initialize managers
        this.initManagers();
    }
    
    /**
     * Initialize tab navigation
     */
    initTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }
    
    /**
     * Switch between tabs
     * @param {string} tabId - The ID of the tab to switch to
     */
    switchTab(tabId) {
        const previousTab = this.state.activeTab;
        
        // Update active tab state
        this.state.activeTab = tabId;
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update tab content
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            if (pane.id === `${tabId}-tab`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
        
        // If switching away from runs tab, clear runs-related content
        if (previousTab === 'runs' && tabId !== 'runs') {
            const runsList = document.getElementById('runs-list');
            if (runsList) {
                runsList.innerHTML = '';
            }
            
            const runDetails = document.getElementById('run-details');
            if (runDetails) {
                runDetails.innerHTML = '';
            }
            
            const responseList = document.getElementById('response-list');
            if (responseList) {
                responseList.innerHTML = '';
            }
            
            // Ensure runs list header is not visible in other tabs
            const runsListHeader = document.querySelector('.runs-list .list-header');
            if (runsListHeader) {
                runsListHeader.style.display = 'none';
            }
        }
        
        // Make sure the runs list is properly styled
        document.querySelectorAll('#blocks-tab .runs-list, #payloads-tab .runs-list, #workflows-tab .runs-list').forEach(el => {
            el.style.display = 'none';
        });
        
        // If switching to runs tab, make sure header is visible
        if (tabId === 'runs') {
            const runsListHeader = document.querySelector('.runs-list .list-header');
            if (runsListHeader) {
                runsListHeader.style.display = 'flex';
            }
        }
        
        // Load data for the new tab
        this.loadActiveTabData();
    }
    
    /**
     * Initialize WebSocket connection
     */
    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            this.showSystemMessage('INFO', 'Connected to server');
        };
        
        this.socket.onclose = () => {
            this.showSystemMessage('WARNING', 'Disconnected from server. Trying to reconnect...');
            // Try to reconnect after 5 seconds
            setTimeout(() => this.initWebSocket(), 5000);
        };
        
        this.socket.onerror = (error) => {
            this.showSystemMessage('ERROR', 'WebSocket error: ' + error);
        };
        
        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleSocketMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
    }
    
    /**
     * Initialize application managers
     */
    initManagers() {
        // Initialize block manager
        this.blockManager = new BlockManager(this);
        
        // Initialize payload manager
        this.payloadManager = new PayloadManager(this);
        
        // Initialize workflow manager
        this.workflowManager = new WorkflowManager(this);
        
        // Initialize runs manager
        this.runsManager = new RunsManager(this);
        
        // Initialize database manager
        this.databaseManager = new DatabaseManager(this);
        
        // Initialize database button
        const dbManagementBtn = document.getElementById('db-management-btn');
        if (dbManagementBtn) {
            dbManagementBtn.addEventListener('click', () => {
                this.databaseManager.showModal();
            });
        }
        
        // Initialize clear status button
        const clearStatusBtn = document.getElementById('clear-status-btn');
        if (clearStatusBtn) {
            clearStatusBtn.addEventListener('click', () => {
                const messagesContainer = document.getElementById('system-messages');
                messagesContainer.innerHTML = '';
            });
        }
        
        // Load initial data for active tab
        this.loadActiveTabData();
    }
    
    /**
     * Load data for the active tab
     */
    loadActiveTabData() {
        switch (this.state.activeTab) {
            case 'blocks':
                this.blockManager.loadBlocks();
                break;
            case 'payloads':
                this.payloadManager.loadPayloads();
                break;
            case 'workflows':
                this.workflowManager.loadWorkflows();
                break;
            case 'runs':
                // Reinitialize the runs manager UI when switching to runs tab
                this.runsManager.initUI();
                this.runsManager.loadRuns();
                break;
        }
    }
    
    /**
     * Handle incoming WebSocket messages
     * @param {Object} message - The message object
     */
    handleSocketMessage(message) {
        // Handle different message types
        switch (message.type) {
            case 'SYSTEM_MESSAGE':
                this.showSystemMessage(message.level, message.message);
                break;
                
            case 'BLOCK_CREATED':
            case 'BLOCK_DELETED':
            case 'PAYLOAD_CREATED':
            case 'PAYLOAD_UPDATED':
            case 'PAYLOAD_DELETED':
            case 'RUN_DELETED':
                // Use registered message handlers
                if (this.messageHandlers && this.messageHandlers[message.type]) {
                    console.log(`Handling message type: ${message.type}`);
                    this.messageHandlers[message.type](message);
                } else if (message.type === 'RUN_DELETED' && this.runsManager) {
                    // Special handling for RUN_DELETED if no handler is registered
                    console.log('Using fallback handler for RUN_DELETED');
                    this.runsManager.handleRunDeleted(message);
                } else {
                    console.log('No handler registered for message type:', message.type);
                }
                break;
                
            case 'WORKFLOW_CREATED':
            case 'WORKFLOW_UPDATED':
            case 'WORKFLOW_DELETED':
                if (this.workflowManager) {
                    this.workflowManager.handleWebSocketMessage(message);
                }
                break;
                
            case 'WORKFLOW_UPDATE':
                this.handleWorkflowUpdate(message);
                break;
                
            case 'execution_progress':
            case 'payload_completed':
            case 'workflow_completed':
            case 'workflow_failed':
                // Show progress bar if hidden
                const progressElement = document.getElementById('execution-progress');
                if (progressElement) {
                    progressElement.classList.remove('hidden');
                }
                
                // Route execution messages to workflow manager
                if (this.workflowManager) {
                    this.workflowManager.handleWebSocketMessage(message);
                } else {
                    console.log('No workflow manager available for message type:', message.type);
                }
                break;
                
            default:
                console.log('Unhandled message type:', message.type);
        }
    }
    
    /**
     * Register a message handler
     * @param {string} module - The module name (e.g., 'workflows')
     * @param {Function} handler - The handler function
     */
    registerMessageHandler(module, handler) {
        if (!this.messageHandlers) {
            this.messageHandlers = {};
        }
        this.messageHandlers[module] = handler;
        console.log(`Registered message handler for ${module}`);
    }
    
    /**
     * Handle workflow execution updates
     * @param {Object} message - The workflow update message
     */
    handleWorkflowUpdate(message) {
        if (this.state.activeTab === 'workflows') {
            // Update workflow execution progress UI
            const progressElement = document.getElementById('execution-progress');
            const progressFill = progressElement.querySelector('.progress-fill');
            const progressStatus = progressElement.querySelector('.progress-status');
            
            // Handle both message formats
            const progressData = message.data || message;
            
            if (progressData.progress !== undefined) {
                // Update progress bar
                progressFill.style.width = `${progressData.progress}%`;
                progressStatus.textContent = `${Math.round(progressData.progress)}%`;
                
                // Update current payload
                document.getElementById('current-payload-name').textContent = progressData.payloadName || 'Processing...';
                document.getElementById('execution-status').textContent = progressData.status || 'Running';
                
                // Update tokens per second if available
                if (progressData.metadata && progressData.metadata.tokens_per_second) {
                    document.getElementById('execution-tokens-per-second').textContent = 
                        Math.round(progressData.metadata.tokens_per_second);
                }
            }
            
            // Handle completion or failure
            if (message.type === 'workflow_completed') {
                this.showSystemMessage('INFO', 'Workflow execution completed successfully');
                document.getElementById('execution-status').textContent = 'Completed';
                
                // Let the workflow manager handle the completion message display
                // We don't add any message here to avoid duplication
            } else if (message.type === 'workflow_failed') {
                this.showSystemMessage('ERROR', `Workflow execution failed: ${progressData.error || 'Unknown error'}`);
                document.getElementById('execution-status').textContent = 'Failed';
            }
        }
    }
    
    /**
     * Show a system message
     * @param {string} level - Message level (INFO, WARNING, ERROR)
     * @param {string} message - The message to display
     */
    showSystemMessage(level, message) {
        const messagesContainer = document.getElementById('system-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `system-message ${level.toLowerCase()}`;
        messageElement.textContent = message;
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString();
        messageElement.title = timestamp;
        
        // Add to container
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Perform API request
     * @param {string} url - API endpoint URL
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {Object} data - Request data (optional)
     * @returns {Promise} - Promise resolving with the response data
     */
    async apiRequest(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            
            // For DELETE requests, which often return empty responses
            if (method === 'DELETE' && response.status === 204) {
                return {}; // Return empty object instead of trying to parse
            }
            
            // Check if there's content to parse
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return {}; // Return empty object for non-JSON responses
            }
        } catch (error) {
            this.showSystemMessage('ERROR', error.message);
            throw error;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});