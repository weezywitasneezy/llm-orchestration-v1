/**
 * Runtime patch for the WorkflowManager
 */
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the app and workflow manager to initialize
    setTimeout(() => {
        if (window.app && window.app.workflowManager) {
            console.log('Patching WorkflowManager.executeWorkflow method');
            
            // Store the original method
            const originalExecute = window.app.workflowManager.executeWorkflow;
            
            // Replace with enhanced version
            window.app.workflowManager.executeWorkflow = async function() {
                try {
                    // Call the original method
                    return await originalExecute.apply(this, arguments);
                } catch (error) {
                    console.error('Error in executeWorkflow:', error);
                    
                    // Use our error display utility
                    if (window.errorDisplay && this.executionProgress) {
                        window.errorDisplay.showExecutionError(this.executionProgress, error);
                    }
                    
                    // Make sure execution state is reset
                    this.executionInProgress = false;
                    if (this.executeWorkflowBtn) {
                        this.executeWorkflowBtn.disabled = false;
                    }
                }
            };
            
            console.log('WorkflowManager successfully patched');
        }
    }, 300); // Slightly longer timeout to ensure everything is loaded
});
