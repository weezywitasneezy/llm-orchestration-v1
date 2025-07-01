/**
 * LLM Orchestration Application
 * Initialize LLM service with test instances
 * 
 * This module automatically runs when the llm.js service is imported
 * and registers test LLM instances for development
 */

const llmService = require('./llm');

// For development environment, set up simulated LLMs
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    console.log('Setting up simulated LLM instances for development');
    
    // Enable LLM simulation
    process.env.SIMULATE_LLM = 'true';
    process.env.SIMULATE_LLM_AVAILABLE = 'true';
    
    // Register test instances on common ports
    llmService.registerInstance(5001, 'Simulated LLM 1 (small)', {
        temperature: 0.7, 
        max_length: 1000
    });
    
    llmService.registerInstance(5002, 'Simulated LLM 2 (medium)', {
        temperature: 0.5, 
        max_length: 2000
    });
    
    llmService.registerInstance(5003, 'Simulated LLM 3 (large)', {
        temperature: 0.4, 
        max_length: 4000
    });
    
    console.log('Simulated LLM instances registered');
}

module.exports = llmService;
