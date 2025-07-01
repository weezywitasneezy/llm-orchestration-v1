/**
 * Error display utility for workflow execution
 */

// Create a global errorDisplay object
window.errorDisplay = {
    /**
     * Show an error in the execution progress container
     * @param {HTMLElement} container - The container element
     * @param {Error|Object} error - The error object 
     */
    showExecutionError(container, error) {
        if (!container) return;
        
        // Get error message
        const errorMessage = error.message || 'Unknown error';
        
        // Create an error container
        const errorElement = document.createElement('div');
        errorElement.className = 'execution-error'; 
        errorElement.style.color = 'red';
        errorElement.style.margin = '10px 0';
        errorElement.style.padding = '8px';
        errorElement.style.border = '1px solid red';
        errorElement.style.borderRadius = '4px';
        errorElement.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
        errorElement.textContent = `Error: ${errorMessage}`;
        
        // Add to container
        container.appendChild(errorElement);
    }
};
