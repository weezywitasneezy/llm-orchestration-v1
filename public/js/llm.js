/**
 * LLM Orchestration Application
 * LLM Communication Service (Frontend Client)
 */

class LLMClient {
    constructor() {
        this.llmInstances = [];
    }
    
    /**
     * Get all available LLM instances
     * @returns {Promise<Array>} - Promise resolving to array of LLM instances
     */
    async getInstances() {
        try {
            const response = await fetch('/api/llm/instances');
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            const data = await response.json();
            this.llmInstances = data;
            return data;
        } catch (error) {
            console.error('Failed to fetch LLM instances:', error);
            throw error;
        }
    }
    
    /**
     * Test connectivity to an LLM instance
     * @param {number} port - The port number to test
     * @returns {Promise<Object>} - Promise resolving to test result
     */
    async testConnectivity(port) {
        try {
            const response = await fetch(`/api/llm/test/${port}`);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to test LLM instance on port ${port}:`, error);
            throw error;
        }
    }
    
    /**
     * Get detailed information about an LLM instance
     * @param {number} port - The port number
     * @returns {Promise<Object>} - Promise resolving to instance information
     */
    async getInstanceInfo(port) {
        try {
            const response = await fetch(`/api/llm/info/${port}`);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to get info for LLM instance on port ${port}:`, error);
            throw error;
        }
    }
}

// Create and expose the client
window.llmClient = new LLMClient();