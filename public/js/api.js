/**
 * LLM Orchestration Application
 * API Client functions
 */

class ApiClient {
    /**
     * Perform API request
     * @param {string} url - API endpoint URL
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {Object} data - Request data (optional)
     * @returns {Promise} - Promise resolving with the response data
     */
    static async request(url, method = 'GET', data = null) {
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
            console.error(`API Error: ${error.message}`);
            throw error;
        }
    }
}

// Make available in the global scope
window.ApiClient = ApiClient;