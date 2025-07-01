/**
 * LLM Orchestration Application
 * Block management functionality
 */

class BlockManager {
    constructor(app) {
        this.app = app;
        this.blocks = new Map();
        this.selectedBlock = null;
        
        // DOM elements
        this.blockForm = document.getElementById('block-form');
        this.blockTree = document.getElementById('block-tree');
        this.newBlockBtn = document.getElementById('new-block-btn');
        this.deleteBlockBtn = document.getElementById('delete-block-btn');
        this.blockSearch = document.getElementById('block-search');
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Load blocks from server
        this.loadBlocks();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // New block button
        this.newBlockBtn.addEventListener('click', () => {
            this.selectBlock(null);
        });
        
        // Delete block button
        this.deleteBlockBtn.addEventListener('click', () => {
            this.deleteSelectedBlock();
        });
        
        // Block form submission
        this.blockForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBlock();
        });
        
        // Block search
        this.blockSearch.addEventListener('input', () => {
            this.filterBlocks(this.blockSearch.value);
        });
    }
    
    /**
     * Load blocks from server
     */
    async loadBlocks() {
        try {
            const blocks = await this.app.apiRequest('/api/blocks');
            
            // Store blocks in memory
            blocks.forEach(block => {
                this.blocks.set(block.id, block);
            });
            
            // Update UI
            this.updateBlockTree();
            
            this.app.showSystemMessage('INFO', `Loaded ${blocks.length} blocks`);
        } catch (error) {
            console.error('Failed to load blocks:', error);
        }
    }
    
    /**
     * Update block tree UI
     */
    updateBlockTree() {
        // Clear current tree
        this.blockTree.innerHTML = '';
        
        // Group blocks by folder
        const folders = new Map();
        
        this.blocks.forEach(block => {
            const folderPath = block.folder_path || 'Uncategorized';
            
            if (!folders.has(folderPath)) {
                folders.set(folderPath, []);
            }
            
            folders.get(folderPath).push(block);
        });
        
        // Sort folders by name
        const sortedFolders = Array.from(folders.entries()).sort((a, b) => {
            return a[0].localeCompare(b[0]);
        });
        
        // Create folder elements
        sortedFolders.forEach(([folderPath, folderBlocks]) => {
            const folderElement = this.createFolderElement(folderPath, folderBlocks);
            this.blockTree.appendChild(folderElement);
        });
    }
    
    /**
     * Create a folder element for the block tree
     * @param {string} folderPath - The folder path
     * @param {Array} blocks - Array of blocks in this folder
     * @returns {HTMLElement} - The folder element
     */
    createFolderElement(folderPath, blocks) {
        const folderElement = document.createElement('div');
        folderElement.className = 'folder';
        
        // Create folder header
        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        folderHeader.innerHTML = `
            <span class="folder-name">${folderPath}</span>
            <span class="folder-count">${blocks.length}</span>
        `;
        
        // Toggle folder content visibility on click
        folderHeader.addEventListener('click', () => {
            folderContent.classList.toggle('hidden');
        });
        
        // Create folder content
        const folderContent = document.createElement('div');
        folderContent.className = 'folder-content';
        
        // Sort blocks by title
        const sortedBlocks = [...blocks].sort((a, b) => a.title.localeCompare(b.title));
        
        // Add block items
        sortedBlocks.forEach(block => {
            const blockElement = this.createBlockElement(block);
            folderContent.appendChild(blockElement);
        });
        
        folderElement.appendChild(folderHeader);
        folderElement.appendChild(folderContent);
        
        return folderElement;
    }
    
    /**
     * Create a block element for the block tree
     * @param {Object} block - The block data
     * @returns {HTMLElement} - The block element
     */
    createBlockElement(block) {
        const blockElement = document.createElement('div');
        blockElement.className = 'block-item';
        blockElement.dataset.id = block.id;
        
        if (this.selectedBlock && this.selectedBlock.id === block.id) {
            blockElement.classList.add('selected');
        }
        
        // Display block title and tags
        blockElement.innerHTML = `
            <span class="block-title">${block.title}</span>
            <span class="block-tags">${Array.isArray(block.tags) ? block.tags.join(', ') : block.tags || ''}</span>
        `;
        
        // Select block on click
        blockElement.addEventListener('click', () => {
            this.selectBlock(block);
        });
        
        return blockElement;
    }
    
    /**
     * Select a block for editing
     * @param {Object|null} block - The block to select, or null to create a new block
     */
    selectBlock(block) {
        this.selectedBlock = block;
        
        // Update selected block in UI
        const blockItems = document.querySelectorAll('.block-item');
        blockItems.forEach(item => {
            const isSelected = block && item.dataset.id == block.id;
            item.classList.toggle('selected', isSelected);
        });
        
        // Update form
        if (block) {
            this.blockForm.title.value = block.title || '';
            this.blockForm.content.value = block.content || '';
            this.blockForm.tags.value = Array.isArray(block.tags) ? block.tags.join(', ') : (block.tags || '');
            this.blockForm.folder_path.value = block.folder_path || '';
            this.deleteBlockBtn.removeAttribute('disabled');
        } else {
            this.blockForm.reset();
            this.deleteBlockBtn.setAttribute('disabled', 'disabled');
        }
    }
    
    /**
     * Save the current block
     */
    async saveBlock() {
        const formData = new FormData(this.blockForm);
        const blockData = {
            title: formData.get('title'),
            content: formData.get('content'),
            tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
            folder_path: formData.get('folder_path')
        };
        
        try {
            let savedBlock;
            let response;
            
            if (this.selectedBlock) {
                // Update existing block
                response = await fetch(`/api/blocks/${this.selectedBlock.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(blockData)
                });
                this.app.showSystemMessage('INFO', `Block "${blockData.title}" updated`);
            } else {
                // Create new block
                response = await fetch('/api/blocks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(blockData)
                });
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to save block: ${response.status} ${response.statusText}`);
            }
            
            savedBlock = await response.json();
            
            // Update local state
            this.blocks.set(savedBlock.id, savedBlock);
            
            // Update UI
            this.updateBlockTree();
            
            // Select the saved block
            this.selectBlock(savedBlock);
        } catch (error) {
            console.error('Failed to save block:', error);
            this.app.showSystemMessage('ERROR', error.message);
        }
    }
    
    /**
     * Delete the selected block
     */
    async deleteSelectedBlock() {
        if (!this.selectedBlock) {
            console.warn('No block selected for deletion');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete the block "${this.selectedBlock.title}"?`)) {
            return;
        }
        
        try {
            // Store the block ID before clearing selection
            const blockId = this.selectedBlock.id;
            
            // Clear selection before making the API call
            this.selectBlock(null);
            
            const response = await fetch(`/api/blocks/${blockId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete block: ${response.status} ${response.statusText}`);
            }
            
            // Update local state
            this.blocks.delete(blockId);
            
            // Update UI
            this.updateBlockTree();
            
            this.app.showSystemMessage('INFO', 'Block deleted');
        } catch (error) {
            console.error('Failed to delete block:', error);
            this.app.showSystemMessage('ERROR', `Failed to delete block: ${error.message}`);
        }
    }
    
    /**
     * Filter blocks by search term
     * @param {string} searchTerm - The search term
     */
    filterBlocks(searchTerm) {
        searchTerm = searchTerm.toLowerCase();
        
        // If search is empty, show all
        if (!searchTerm) {
            this.updateBlockTree();
            return;
        }
        
        // Filter blocks that match the search term
        const filteredBlocks = new Map();
        
        this.blocks.forEach(block => {
            const title = block.title.toLowerCase();
            const content = block.content.toLowerCase();
            const tags = Array.isArray(block.tags) 
                ? block.tags.join(' ').toLowerCase() 
                : (block.tags || '').toLowerCase();
            
            if (title.includes(searchTerm) || 
                content.includes(searchTerm) || 
                tags.includes(searchTerm)) {
                filteredBlocks.set(block.id, block);
            }
        });
        
        // Clear current tree
        this.blockTree.innerHTML = '';
        
        // Create search results folder
        const folderElement = document.createElement('div');
        folderElement.className = 'folder';
        
        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        folderHeader.innerHTML = `
            <span class="folder-name">Search Results</span>
            <span class="folder-count">${filteredBlocks.size}</span>
        `;
        
        const folderContent = document.createElement('div');
        folderContent.className = 'folder-content';
        
        // Add filtered blocks
        filteredBlocks.forEach(block => {
            const blockElement = this.createBlockElement(block);
            folderContent.appendChild(blockElement);
        });
        
        folderElement.appendChild(folderHeader);
        folderElement.appendChild(folderContent);
        this.blockTree.appendChild(folderElement);
    }
    
    /**
     * Get a block by ID
     * @param {number} id - The block ID
     * @returns {Object|null} - The block data or null if not found
     */
    getBlockById(id) {
        return this.blocks.get(id) || null;
    }
    
    /**
     * Get all blocks
     * @returns {Array} - Array of all blocks
     */
    getAllBlocks() {
        return Array.from(this.blocks.values());
    }
}

// Initialize block manager when app is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to be initialized
    setTimeout(() => {
        if (window.app && !window.app.blockManager) {
            window.app.blockManager = new BlockManager(window.app);
            
            // Register message handlers with the app
            if (window.app.registerMessageHandler) {
                window.app.registerMessageHandler('BLOCK_CREATED', handleBlockCreated);
                window.app.registerMessageHandler('BLOCK_DELETED', handleBlockDeleted);
            }
        }
    }, 100);
});

// Handle block creation events
function handleBlockCreated(message) {
    if (!window.app || !window.app.blockManager) return;
    
    // Only add the block if it doesn't already exist
    if (!window.app.blockManager.blocks.has(message.block.id)) {
        window.app.blockManager.blocks.set(message.block.id, message.block);
        window.app.blockManager.updateBlockTree();
    }
}

// Handle block deletion events
function handleBlockDeleted(message) {
    if (!window.app || !window.app.blockManager) return;
    
    // Remove the deleted block from state
    window.app.blockManager.blocks.delete(message.blockId);
    window.app.blockManager.updateBlockTree();
}