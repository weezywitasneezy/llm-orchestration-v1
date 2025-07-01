/**
 * LLM Orchestration Application
 * LLM Connectivity Tester
 */

class LLMTester {
    constructor(app) {
        this.app = app;
        this.testHistory = [];
        
        // Initialize the UI
        this.initUI();
        this.attachEventListeners();
    }
    
    /**
     * Initialize the UI components
     */
    initUI() {
        // Create a test connectivity button in the UI
        this.addTestButtonToPayloadsTab();
        
        // Create a modal for displaying test results
        this.createTestModal();
    }
    
    /**
     * Add a test button to the payloads tab
     */
    addTestButtonToPayloadsTab() {
        const payloadTab = document.getElementById('payloads-tab');
        if (!payloadTab) return;
        
        // Add a button to the toolbar
        const toolbar = payloadTab.querySelector('.llm-config') || payloadTab.querySelector('.form-group');
        if (!toolbar) return;
        
        const testButton = document.createElement('button');
        testButton.type = 'button';
        testButton.id = 'test-llm-connection-btn';
        testButton.className = 'action-btn test-btn';
        testButton.textContent = 'Test LLM Connection';
        testButton.style.marginTop = '10px';
        
        // Insert the button
        toolbar.appendChild(testButton);
        
        // Store reference
        this.testButton = testButton;
    }
    
    /**
     * Create a modal for displaying test results
     */
    createTestModal() {
        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'llm-test-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        
        // Create modal content
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>LLM Connectivity Test</h3>
                    <button type="button" class="close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="test-form">
                        <div class="form-group">
                            <label for="llm-port">LLM Port:</label>
                            <div class="input-with-buttons">
                                <input type="number" id="llm-port" min="1" max="65535" value="5001">
                                <button type="button" id="run-test-btn" class="action-btn">Basic Test</button>
                                <button type="button" id="run-detailed-test-btn" class="action-btn">Detailed Test</button>
                            </div>
                        </div>
                    </div>
                    <div id="test-results" class="test-results">
                        <div class="results-placeholder">Run a test to see results</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Store references
        this.modal = modal;
        this.portInput = modal.querySelector('#llm-port');
        this.runTestBtn = modal.querySelector('#run-test-btn');
        this.runDetailedTestBtn = modal.querySelector('#run-detailed-test-btn');
        this.testResults = modal.querySelector('#test-results');
        this.closeBtn = modal.querySelector('.close-btn');
        
        // Add CSS for the new input-with-buttons class
        const style = document.createElement('style');
        style.textContent = `
            .input-with-buttons {
                display: flex;
                gap: 0.5rem;
            }
            .input-with-buttons input {
                flex: 1;
            }
            .model-info-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 1rem;
            }
            .model-info-table th, .model-info-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            .model-info-table th {
                background-color: #f5f5f5;
            }
            .api-status {
                display: flex;
                gap: 1rem;
                margin-top: 1rem;
            }
            .api-badge {
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 0.8rem;
                font-weight: bold;
            }
            .api-badge.available {
                background-color: #2ecc71;
                color: white;
            }
            .api-badge.unavailable {
                background-color: #e74c3c;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Test button in payload tab
        if (this.testButton) {
            this.testButton.addEventListener('click', () => {
                this.showTestModal();
            });
        }
        
        // Close button in modal
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.hideTestModal();
            });
        }
        
        // Run basic test button in modal
        if (this.runTestBtn) {
            this.runTestBtn.addEventListener('click', () => {
                this.runTest();
            });
        }
        
        // Run detailed test button in modal
        if (this.runDetailedTestBtn) {
            this.runDetailedTestBtn.addEventListener('click', () => {
                this.runDetailedTest();
            });
        }
        
        // Enter key in port input
        if (this.portInput) {
            this.portInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.runTest();
                }
            });
        }
    }
    
    /**
     * Show the test modal
     */
    showTestModal() {
        if (this.modal) {
            this.modal.style.display = 'block';
        }
    }
    
    /**
     * Hide the test modal
     */
    hideTestModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
    
    /**
     * Run connectivity test
     */
    async runTest() {
        // Get the port number
        const port = parseInt(this.portInput.value, 10);
        
        if (isNaN(port) || port <= 0 || port > 65535) {
            this.app.showSystemMessage('ERROR', 'Please enter a valid port number (1-65535)');
            return;
        }
        
        // Show loading state
        this.runTestBtn.disabled = true;
        this.runDetailedTestBtn.disabled = true;
        this.testResults.innerHTML = '<div class="loading">Testing connection...</div>';
        
        try {
            // Call API to test connectivity
            const result = await this.app.apiRequest(`/api/llm/test/${port}`);
            
            // Store in history
            this.testHistory.push({
                port,
                result,
                timestamp: new Date()
            });
            
            // Display results
            this.displayTestResults(result);
        } catch (error) {
            console.error('Error testing LLM connection:', error);
            this.testResults.innerHTML = `
                <div class="error">
                    <h4>Error Testing Connection</h4>
                    <p>${error.message || 'Unknown error occurred'}</p>
                    ${error.message && error.message.includes('timed out') ? 
                        '<p><strong>Troubleshooting Tips:</strong></p>' +
                        '<ul>' +
                        '<li>Make sure Kobold.cpp is running on this port</li>' +
                        '<li>Check for any firewall blocking the connection</li>' +
                        '<li>The server might be busy with other requests</li>' +
                        '</ul>'
                        : ''}
                </div>
            `;
        } finally {
            // Reset button state
            this.runTestBtn.disabled = false;
            this.runDetailedTestBtn.disabled = false;
        }
    }
    
    /**
     * Display test results in the modal
     * @param {Object} result - The test result object
     */
    displayTestResults(result) {
        if (!this.testResults) return;
        
        // Empty the results container
        this.testResults.innerHTML = '';
        
        // Create results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = result.connected ? 'success-result' : 'error-result';
        
        // Add connection status
        const statusEl = document.createElement('div');
        statusEl.className = 'connection-status';
        statusEl.innerHTML = `
            <h4>Connection Status: ${result.connected ? 'Connected' : 'Failed'}</h4>
            <p>Port: ${this.portInput.value}</p>
            <p>Time: ${new Date().toLocaleTimeString()}</p>
        `;
        resultsContainer.appendChild(statusEl);
        
        // Add model info if connected
        if (result.connected && result.modelInfo) {
            const modelInfo = document.createElement('div');
            modelInfo.className = 'model-info';
            
            // Format model info based on what's available
            let modelContent = '<h4>Model Information:</h4>';
            
            if (result.modelInfo.model) {
                modelContent += `<p><strong>Model:</strong> ${result.modelInfo.model}</p>`;
            }
            
            if (result.modelInfo.api_version) {
                modelContent += `<p><strong>API Version:</strong> ${result.modelInfo.api_version}</p>`;
            }
            
            if (result.modelInfo.data && Array.isArray(result.modelInfo.data)) {
                // OpenAI compatible format
                modelContent += '<p><strong>Available Models:</strong></p>';
                modelContent += '<ul>';
                result.modelInfo.data.forEach(model => {
                    modelContent += `<li>${model.id || 'Unknown'}</li>`;
                });
                modelContent += '</ul>';
            }
            
            modelInfo.innerHTML = modelContent;
            resultsContainer.appendChild(modelInfo);
        } else if (!result.connected && result.error) {
            // Show error details
            const errorInfo = document.createElement('div');
            errorInfo.className = 'error-info';
            errorInfo.innerHTML = `
                <h4>Error Details:</h4>
                <p>${result.error}</p>
            `;
            resultsContainer.appendChild(errorInfo);
        }
        
        // Add to results container
        this.testResults.appendChild(resultsContainer);
    }
    /**
     * Run detailed connectivity test
     */
    async runDetailedTest() {
        // Get the port number
        const port = parseInt(this.portInput.value, 10);
        
        if (isNaN(port) || port <= 0 || port > 65535) {
            this.app.showSystemMessage('ERROR', 'Please enter a valid port number (1-65535)');
            return;
        }
        
        // Show loading state
        this.runTestBtn.disabled = true;
        this.runDetailedTestBtn.disabled = true;
        this.testResults.innerHTML = '<div class="loading">Performing detailed connectivity test...</div>';
        
        try {
            // Call API to test connectivity
            const result = await this.app.apiRequest(`/api/llm/detailed-test/${port}`);
            
            // Store in history
            this.testHistory.push({
                port,
                result,
                detailed: true,
                timestamp: new Date()
            });
            
            // Display detailed results
            this.displayDetailedTestResults(result);
        } catch (error) {
            console.error('Error performing detailed LLM test:', error);
            this.testResults.innerHTML = `
                <div class="error">
                    <h4>Error Testing Connection</h4>
                    <p>${error.message || 'Unknown error occurred'}</p>
                    ${error.message && error.message.includes('timed out') ? 
                        '<p><strong>Troubleshooting Tips:</strong></p>' +
                        '<ul>' +
                        '<li>Make sure Kobold.cpp is running on this port</li>' +
                        '<li>Check for any firewall blocking the connection</li>' +
                        '<li>The server might be busy with other requests</li>' +
                        '</ul>'
                        : ''}
                </div>
            `;
        } finally {
            // Reset button state
            this.runTestBtn.disabled = false;
            this.runDetailedTestBtn.disabled = false;
        }
    }
    
    /**
     * Display detailed test results in the modal
     * @param {Object} result - The detailed test result object
     */
    displayDetailedTestResults(result) {
        if (!this.testResults) return;
        
        // Empty the results container
        this.testResults.innerHTML = '';
        
        // Create results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = result.connected ? 'success-result' : 'error-result';
        
        // Add connection status
        const statusEl = document.createElement('div');
        statusEl.className = 'connection-status';
        statusEl.innerHTML = `
            <h4>Connection Status: ${result.connected ? 'Connected' : 'Failed'}</h4>
            <p>Port: ${this.portInput.value}</p>
            <p>Time: ${new Date().toLocaleTimeString()}</p>
        `;
        resultsContainer.appendChild(statusEl);
        
        // Add API availability status
        const apiStatusEl = document.createElement('div');
        apiStatusEl.className = 'api-status';
        apiStatusEl.innerHTML = `
            <span class="api-badge ${result.koboldApiAvailable ? 'available' : 'unavailable'}">
                Kobold API: ${result.koboldApiAvailable ? 'Available' : 'Unavailable'}
            </span>
            <span class="api-badge ${result.openAiApiAvailable ? 'available' : 'unavailable'}">
                OpenAI API: ${result.openAiApiAvailable ? 'Available' : 'Unavailable'}
            </span>
        `;
        resultsContainer.appendChild(apiStatusEl);
        
        // Add model info if available
        if (result.connected && result.modelInfo) {
            const modelInfoEl = document.createElement('div');
            modelInfoEl.className = 'detailed-model-info';
            
            // Create a table to display model info
            let tableHTML = '<h4>Model Information:</h4><table class="model-info-table"><tr><th>Property</th><th>Value</th></tr>';
            
            // Format model info based on API responses
            if (result.koboldApiAvailable && result.apiDetails.kobold) {
                const koboldInfo = result.apiDetails.kobold;
                if (koboldInfo.model) tableHTML += `<tr><td>Model Name</td><td>${koboldInfo.model}</td></tr>`;
                if (koboldInfo.model_size) tableHTML += `<tr><td>Model Size</td><td>${koboldInfo.model_size}</td></tr>`;
                if (koboldInfo.lora) tableHTML += `<tr><td>LoRA Adapters</td><td>${Array.isArray(koboldInfo.lora) ? koboldInfo.lora.join(', ') : koboldInfo.lora}</td></tr>`;
            }
            
            if (result.openAiApiAvailable && result.apiDetails.openai) {
                const openaiInfo = result.apiDetails.openai;
                if (openaiInfo.data && Array.isArray(openaiInfo.data) && openaiInfo.data.length > 0) {
                    tableHTML += `<tr><td>Available Models</td><td>${openaiInfo.data.map(m => m.id).join(', ')}</td></tr>`;
                }
            }
            
            tableHTML += '</table>';
            modelInfoEl.innerHTML = tableHTML;
            resultsContainer.appendChild(modelInfoEl);
        }
        
        // Show error details if not connected
        if (!result.connected && result.error) {
            const errorInfoEl = document.createElement('div');
            errorInfoEl.className = 'error-info';
            errorInfoEl.innerHTML = `
                <h4>Error Details:</h4>
                <p>${result.error}</p>
            `;
            resultsContainer.appendChild(errorInfoEl);
        }
        
        // Add to results container
        this.testResults.appendChild(resultsContainer);
    }
}

// Export the LLMTester class for browser environments
if (typeof window !== 'undefined') {
    window.LLMTester = LLMTester;
}