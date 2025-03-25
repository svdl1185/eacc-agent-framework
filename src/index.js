// src/index.js
const config = require('./config');
const connector = require('./connector');
const agentManager = require('./agent-manager');

/**
 * Main entry point for the EACC Agent Framework
 */
async function main() {
  try {
    console.log('==========================================');
    console.log('Starting EACC Agent Framework...');
    console.log('==========================================');
    
    // Initialize the agent manager (this will also initialize the connector)
    await agentManager.initialize();
    
    // Start job monitoring
    agentManager.startJobMonitoring();
    
    console.log('==========================================');
    console.log('EACC Agent Framework is running');
    console.log('Enabled agents:', config.enabledAgents.join(', '));
    console.log('==========================================');

    // Handle graceful shutdown
    setupShutdownHandlers();
  } catch (error) {
    console.error('Failed to start EACC Agent Framework:', error);
    process.exit(1);
  }
}

/**
 * Set up handlers for graceful shutdown
 */
function setupShutdownHandlers() {
  // Handle process termination
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown();
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection:', reason);
    shutdown();
  });
}

/**
 * Gracefully shut down the application
 */
async function shutdown() {
  console.log('Shutting down...');
  
  // Stop job monitoring
  agentManager.stopJobMonitoring();
  
  // Perform any additional cleanup here
  
  console.log('Shutdown complete');
  process.exit(0);
}

// Start the application
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error in main:', error);
    process.exit(1);
  });
}

module.exports = { main, shutdown };