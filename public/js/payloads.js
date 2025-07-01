/**
 * LLM Orchestration Application
 * Payload management functionality
 */

class PayloadManager {
    constructor(app) {
        this.app = app;
        this.payloads = new Map();
        this.selectedPayload = null;
        
        // DOM elements
        this.payloadForm = document.getElementById('payload-form');
        this.payloadList = document.getElementById('payload-list-container');
        this.newPayloadBtn = document.getElementById('new-payload-btn');
        this.deletePayloadBtn = document.getElementById('delete-payload-btn');
        this.addBlockBtn = document.getElementById('add-block-btn');
        this.payloadBlocks = document.getElementById('payload-blocks');
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // New payload button
        if (this.newPayloadBtn) {
            this.newPayloadBtn.addEventListener('click', () => {
                this.selectPayload(null);
            });
        }
        
        // Delete payload button
        if (this.deletePayloadBtn) {
            this.deletePayloadBtn.addEventListener('click', () => {
                this.deleteSelectedPayload();
            });
        }
        
        // Add block button
        if (this.addBlockBtn) {
            this.addBlockBtn.addEventListener('click', () => {
                this.showBlockSelector();
            });
        }
        
        // Payload form submission
        if (this.payloadForm) {
            this.payloadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePayload();
            });
        }
        
        // Load payloads when tab is selected
        document.querySelector('[data-tab="payloads"]').addEventListener('click', () => {
            this.loadPayloads();
        });
    }
    
    /**
     * Load payloads from server
     */
    async loadPayloads() {
        try {
            const payloads = await this.app.apiRequest('/api/payloads');
            
            // Store payloads in memory
            this.payloads = new Map();
            payloads.forEach(payload => {
                this.payloads.set(payload.id, payload);
            });
            
            // Update UI
            this.updatePayloadList();
            
            this.app.showSystemMessage('INFO', `Loaded ${payloads.length} payloads`);
        } catch (error) {
            console.error('Failed to load payloads:', error);
        }
    }

    /**
     * Update payload list in UI
     */
    updatePayloadList() {
        if (!this.payloadList) return;
        
        // Clear current list
        this.payloadList.innerHTML = '';
        
        // If no payloads, show empty message
        if (!this.payloads || this.payloads.size === 0) {
            const emptyElement = document.createElement('div');
            emptyElement.className = 'empty-message';
            emptyElement.textContent = 'No payloads found. Create a new payload to get started.';
            this.payloadList.appendChild(emptyElement);
            return;
        }
        
        // Sort payloads by name
        const sortedPayloads = Array.from(this.payloads.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        
        // Create list items for each payload
        sortedPayloads.forEach(payload => {
            const payloadItem = document.createElement('div');
            payloadItem.className = 'payload-item';
            if (this.selectedPayload && this.selectedPayload.id === payload.id) {
                payloadItem.classList.add('selected');
            }
            
            payloadItem.innerHTML = `
                <div class="payload-name">${payload.name}</div>
                <div class="payload-info">
                    <span>${payload.blocks.length} blocks</span>
                    <span>T: ${payload.temperature}</span>
                    <span>Port: ${payload.llm_port}</span>
                </div>
            `;
            
            payloadItem.addEventListener('click', () => {
                this.selectPayload(payload);
            });
            
            this.payloadList.appendChild(payloadItem);
        });
    }
    
    /**
     * Select a payload to edit or create new if null
     * @param {Object|null} payload - The payload to select or null for new
     */
    selectPayload(payload) {
        this.selectedPayload = payload;
        
        // Update form fields
        if (this.payloadForm) {
            const nameInput = this.payloadForm.querySelector('#payload-name');
            const temperatureInput = this.payloadForm.querySelector('#payload-temperature');
            const responseLengthInput = this.payloadForm.querySelector('#payload-response-length');
            const llmPortSelect = this.payloadForm.querySelector('#payload-llm-port');
            const modelFormatSelect = this.payloadForm.querySelector('#payload-model-format');
            
            if (nameInput) {
                nameInput.value = payload ? payload.name : '';
            }
            
            if (temperatureInput) {
                temperatureInput.value = payload ? payload.temperature : 0.6;
            }
            
            if (responseLengthInput) {
                responseLengthInput.value = payload ? payload.response_length : 1000;
            }
            
            if (llmPortSelect) {
                llmPortSelect.value = payload ? payload.llm_port : 5001;
            }
            
            if (modelFormatSelect) {
                modelFormatSelect.value = payload ? payload.model_format : 'default';
            }
            
            // Update blocks list
            this.updateBlocksList();
            
            // Update button states
            if (this.deletePayloadBtn) {
                this.deletePayloadBtn.disabled = !payload;
            }
        }
        
        // Update selected item in list
        this.updatePayloadList();
    }
    
    /**
     * Update the blocks list in the payload form
     */
    updateBlocksList() {
        if (!this.payloadBlocks) return;
        
        // Clear current list
        this.payloadBlocks.innerHTML = '';
        
        // If no payload selected or no blocks, show empty message
        if (!this.selectedPayload || !this.selectedPayload.blocks || this.selectedPayload.blocks.length === 0) {
            const emptyElement = document.createElement('div');
            emptyElement.className = 'empty-message';
            emptyElement.textContent = 'No blocks added. Add blocks to create a payload.';
            this.payloadBlocks.appendChild(emptyElement);
            return;
        }
        
        // Create list items for each block
        this.selectedPayload.blocks.forEach((block, index) => {
            const blockItem = document.createElement('div');
            blockItem.className = 'payload-block';
            
            blockItem.innerHTML = `
                <div class="block-number">${index + 1}</div>
                <div class="block-name">${block.title}</div>
                <div class="block-actions">
                    <button type="button" class="move-up-btn" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="move-down-btn" ${index === this.selectedPayload.blocks.length - 1 ? 'disabled' : ''}>↓</button>
                    <button type="button" class="remove-btn">×</button>
                </div>
            `;
            
            // Add event listeners for buttons
            const moveUpBtn = blockItem.querySelector('.move-up-btn');
            const moveDownBtn = blockItem.querySelector('.move-down-btn');
            const removeBtn = blockItem.querySelector('.remove-btn');
            
            if (moveUpBtn) {
                moveUpBtn.addEventListener('click', () => {
                    this.moveBlock(index, -1);
                });
            }
            
            if (moveDownBtn) {
                moveDownBtn.addEventListener('click', () => {
                    this.moveBlock(index, 1);
                });
            }
            
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    this.removeBlock(index);
                });
            }
            
            this.payloadBlocks.appendChild(blockItem);
        });
    }
    
    /**
     * Move a block up or down in the payload
     * @param {number} index - The current index of the block
     * @param {number} direction - -1 for up, 1 for down
     */
    moveBlock(index, direction) {
        if (!this.selectedPayload || !this.selectedPayload.blocks) return;
        
        const newIndex = index + direction;
        
        // Check if new index is valid
        if (newIndex < 0 || newIndex >= this.selectedPayload.blocks.length) return;
        
        // Swap blocks
        const temp = this.selectedPayload.blocks[index];
        this.selectedPayload.blocks[index] = this.selectedPayload.blocks[newIndex];
        this.selectedPayload.blocks[newIndex] = temp;
        
        // Update UI
        this.updateBlocksList();
    }
    
    /**
     * Remove a block from the payload
     * @param {number} index - The index of the block to remove
     */
    removeBlock(index) {
        if (!this.selectedPayload || !this.selectedPayload.blocks) return;
        
        // Remove block at index
        this.selectedPayload.blocks.splice(index, 1);
        
        // Update UI
        this.updateBlocksList();
    }
    
    /**
     * Show block selector modal
     */
    async showBlockSelector() {
        // Fetch available blocks
        try {
            const blocks = await this.app.apiRequest('/api/blocks');
            
            // Filter out blocks already in the payload
            const availableBlocks = blocks.filter(block => {
                if (!this.selectedPayload || !this.selectedPayload.blocks) return true;
                return !this.selectedPayload.blocks.some(b => b.id === block.id);
            });
            
            if (availableBlocks.length === 0) {
                this.app.showSystemMessage('INFO', 'No more blocks available to add');
                return;
            }
            
            // Show modal with block selection
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Select Block</h3>
                        <button type="button" class="close-btn">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="search-container">
                            <input type="text" id="block-search-modal" placeholder="Search blocks...">
                        </div>
                        <div class="block-selector-list">
                            ${availableBlocks.map(block => `
                                <div class="block-selector-item" data-id="${block.id}">
                                    <div class="block-name">${block.title}</div>
                                    <div class="block-path">${block.folder_path || ''}</div>
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
            
            const searchInput = modal.querySelector('#block-search-modal');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    const search = searchInput.value.toLowerCase();
                    const items = modal.querySelectorAll('.block-selector-item');
                    
                    items.forEach(item => {
                        const blockName = item.querySelector('.block-name').textContent.toLowerCase();
                        const blockPath = item.querySelector('.block-path').textContent.toLowerCase();
                        
                        if (blockName.includes(search) || blockPath.includes(search)) {
                            item.style.display = '';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                });
            }
            
            const blockItems = modal.querySelectorAll('.block-selector-item');
            blockItems.forEach(item => {
                item.addEventListener('click', () => {
                    const blockId = parseInt(item.getAttribute('data-id'));
                    const block = blocks.find(b => b.id === blockId);
                    
                    if (block) {
                        this.addBlock(block);
                    }
                    
                    document.body.removeChild(modal);
                });
            });
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('Failed to load blocks:', error);
            this.app.showSystemMessage('ERROR', 'Failed to load available blocks');
        }
    }
    
    /**
     * Add a block to the payload
     * @param {Object} block - The block to add
     */
    addBlock(block) {
        if (!this.selectedPayload) {
            // Create new payload if none selected
            this.selectedPayload = {
                name: '',
                temperature: 0.6,
                response_length: 1000,
                llm_port: 5001,
                model_format: 'default',
                blocks: []
            };
        }
        
        // Initialize blocks array if it doesn't exist
        if (!this.selectedPayload.blocks) {
            this.selectedPayload.blocks = [];
        }
        
        // Add block to the list
        this.selectedPayload.blocks.push(block);
        
        // Update UI
        this.updateBlocksList();
    }
    
    /**
     * Save current payload (create or update)
     */
    async savePayload() {
        try {
            const nameInput = this.payloadForm.querySelector('#payload-name');
            const temperatureInput = this.payloadForm.querySelector('#payload-temperature');
            const responseLengthInput = this.payloadForm.querySelector('#payload-response-length');
            const llmPortSelect = this.payloadForm.querySelector('#payload-llm-port');
            const modelFormatSelect = this.payloadForm.querySelector('#payload-model-format');
            
            if (!nameInput || !nameInput.value.trim()) {
                this.app.showSystemMessage('ERROR', 'Payload name is required');
                return;
            }
            
            // Validate payload has blocks
            if (!this.selectedPayload || !this.selectedPayload.blocks || this.selectedPayload.blocks.length === 0) {
                this.app.showSystemMessage('ERROR', 'Payload must have at least one block');
                return;
            }
            
            const payloadData = {
                name: nameInput.value.trim(),
                config: {
                    temperature: parseFloat(temperatureInput.value),
                    response_length: parseInt(responseLengthInput.value),
                    llm_port: parseInt(llmPortSelect.value),
                    model_format: modelFormatSelect.value
                },
                blocks: this.selectedPayload.blocks.map(b => b.id)
            };
            
            let response;
            
            // Create or update payload
            if (this.selectedPayload.id) {
                // Update existing payload
                response = await this.app.apiRequest(`/api/payloads/${this.selectedPayload.id}`, 'PUT', payloadData);
                this.app.showSystemMessage('SUCCESS', `Payload "${payloadData.name}" updated`);
            } else {
                // Create new payload
                response = await this.app.apiRequest('/api/payloads', 'POST', payloadData);
                this.app.showSystemMessage('SUCCESS', `Payload "${payloadData.name}" created`);
            }
            
            // Update with saved payload
            if (response) {
                this.payloads.set(response.id, response);
                this.selectPayload(response);
                this.updatePayloadList();
            }
        } catch (error) {
            console.error('Error saving payload:', error);
            this.app.showSystemMessage('ERROR', `Failed to save payload: ${error.message || 'Unknown error'}`);
        }
    }
    
    /**
     * Delete the currently selected payload
     */
    async deleteSelectedPayload() {
        if (!this.selectedPayload || !this.selectedPayload.id) {
            this.app.showSystemMessage('ERROR', 'No payload selected');
            return;
        }
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete the payload "${this.selectedPayload.name}"?`)) {
            return;
        }
        
        try {
            await this.app.apiRequest(`/api/payloads/${this.selectedPayload.id}`, 'DELETE');
            
            this.payloads.delete(this.selectedPayload.id);
            this.selectPayload(null);
            this.updatePayloadList();
            
            this.app.showSystemMessage('SUCCESS', 'Payload deleted');
        } catch (error) {
            console.error('Error deleting payload:', error);
            this.app.showSystemMessage('ERROR', `Failed to delete payload: ${error.message || 'Unknown error'}`);
        }
    }
}

// Export the PayloadManager class
if (typeof window !== 'undefined') {
    // Browser environment
    window.PayloadManager = PayloadManager;
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = PayloadManager;
}