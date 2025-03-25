// src/agent-manager/index.js
const path = require('path');
const config = require('../config');
const connector = require('../connector');

/**
 * Manager for specialized agents
 */
class AgentManager {
  constructor() {
    this.agents = new Map(); // Map of agent name to agent instance
    this.initialized = false;
  }

  /**
   * Initialize the agent manager
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing Agent Manager...');
      
      // Initialize connector
      await connector.initialize();
      
      // Load enabled agents
      await this.loadAgents();
      
      this.initialized = true;
      console.log('Agent Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Agent Manager:', error);
      throw error;
    }
  }

  /**
   * Load enabled agents
   * @private
   */
  async loadAgents() {
    // Check if any agents are enabled
    if (config.enabledAgents.length === 0) {
      console.warn('No agents enabled. Set ENABLED_AGENTS in .env file.');
      return;
    }

    // Load each enabled agent
    for (const agentName of config.enabledAgents) {
      try {
        console.log(`Loading agent: ${agentName}`);
        
        // Import agent module
        const agentPath = path.join(__dirname, '..', 'agents', agentName);
        const AgentClass = require(agentPath);
        
        // Create agent instance with configuration
        const agent = new AgentClass({
          config: config.agentConfig[agentName] || {}
        });
        
        // Initialize agent
        await agent.initialize();
        
        // Add agent to the map
        this.agents.set(agentName, agent);
        
        console.log(`Agent ${agentName} loaded successfully`);
      } catch (error) {
        console.error(`Failed to load agent ${agentName}:`, error);
      }
    }
    
    // Check if any agents were loaded
    if (this.agents.size === 0) {
      throw new Error('No agents could be loaded. Check agent implementations and configuration.');
    }
    
    console.log(`Loaded ${this.agents.size} agents: ${Array.from(this.agents.keys()).join(', ')}`);
  }

  /**
   * Find matching agents for a job
   * @param {Object} job - Job object
   * @param {string} content - Job content
   * @returns {Array} - Array of matching agents
   */
  findMatchingAgents(job, content) {
    const matchingAgents = [];
    
    for (const [name, agent] of this.agents.entries()) {
      if (agent.isJobMatch(job, content)) {
        matchingAgents.push({
          name,
          agent
        });
      }
    }
    
    return matchingAgents;
  }

  /**
   * Process a new job
   * @param {Object} job - Job object
   */
  async processJob(job) {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log(`Processing job ${job.id}: ${job.title}`);
      
      // Get job content
      const content = await connector.getJobContent(job);
      
      // Check if job is relevant
      const isRelevant = connector.isRelevantJob(job, content);
      
      if (!isRelevant) {
        console.log(`Job ${job.id} is not relevant, skipping...`);
        return;
      }
      
      // Find matching agents
      const matchingAgents = this.findMatchingAgents(job, content);
      
      if (matchingAgents.length === 0) {
        console.log(`No matching agents found for job ${job.id}, skipping...`);
        return;
      }
      
      console.log(`Found ${matchingAgents.length} matching agents for job ${job.id}`);
      
      // Use the first matching agent (could implement more sophisticated selection)
      const { name, agent } = matchingAgents[0];
      console.log(`Using agent ${name} for job ${job.id}`);
      
      // Create application message
      const applicationMessage = agent.createApplicationMessage(job, content);
      
      // Apply for the job
      const applicationSuccess = await connector.applyForJob(job.id, applicationMessage);
      
      if (!applicationSuccess) {
        console.error(`Failed to apply for job ${job.id}`);
        return;
      }
      
      // If this is a non-multipleApplicants job, attempt to take it
      if (!job.multipleApplicants) {
        console.log(`Job ${job.id} is non-multipleApplicants, attempting to take it...`);
        await connector.takeJob(job.id);
      }
      
      // Add to active jobs
      agent.addActiveJob(job, content);
      
      console.log(`Successfully processed job ${job.id}`);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
    }
  }

  /**
   * Process active jobs
   */
  async processActiveJobs() {
    if (!this.initialized) await this.initialize();
    
    for (const [name, agent] of this.agents.entries()) {
      // Skip if agent has no active jobs
      if (agent.activeJobs.size === 0) continue;
      
      console.log(`Processing ${agent.activeJobs.size} active jobs for agent ${name}`);
      
      for (const [jobId, jobInfo] of agent.activeJobs.entries()) {
        try {
          // Get latest job state
          const currentJob = await connector.getJob(jobId);
          
          // Check if we are the worker
          if (currentJob.roles.worker.toLowerCase() !== connector.wallet.address.toLowerCase()) {
            console.log(`We are not the worker for job ${jobId}, removing from active jobs`);
            agent.removeActiveJob(jobId);
            continue;
          }
          
          // Check if job status is "Taken" (state === 1)
          if (currentJob.state === 1 && jobInfo.status === 'started' && !currentJob.resultHash) {
            console.log(`Executing job ${jobId}`);
            
            // Update status
            agent.updateActiveJob(jobId, 'executing');
            
            // Execute job
            const result = await agent.executeJob(jobInfo.job, jobInfo.content);
            
            // Package result
            const packagedResult = agent.packageResult(jobInfo.job, jobInfo.content, result);
            
            // Deliver result
            const deliverySuccess = await connector.deliverResult(jobId, packagedResult);
            
            if (deliverySuccess) {
              agent.updateActiveJob(jobId, 'delivered', { result });
              console.log(`Job ${jobId} delivered successfully`);
            } else {
              agent.updateActiveJob(jobId, 'delivery_failed');
              console.error(`Failed to deliver job ${jobId}`);
            }
          }
          // Check if job is completed or disputed
          else if (currentJob.state > 1) {
            console.log(`Job ${jobId} is no longer active (state: ${currentJob.state}), removing from active jobs`);
            agent.removeActiveJob(jobId);
          }
        } catch (error) {
          console.error(`Error processing active job ${jobId}:`, error);
        }
      }
    }
  }

  /**
   * Start job monitoring
   */
  startJobMonitoring() {
    console.log('Starting job monitoring...');
    
    // Poll for new jobs
    this.jobMonitoringInterval = setInterval(async () => {
      try {
        await this.monitorNewJobs();
      } catch (error) {
        console.error('Error monitoring new jobs:', error);
      }
    }, config.jobPollInterval);
    
    // Poll for active jobs
    this.activeJobsMonitoringInterval = setInterval(async () => {
      try {
        await this.processActiveJobs();
      } catch (error) {
        console.error('Error processing active jobs:', error);
      }
    }, config.activeJobsPollInterval);
    
    // Initial check
    this.monitorNewJobs().catch(error => {
      console.error('Error in initial new jobs check:', error);
    });
    
    this.processActiveJobs().catch(error => {
      console.error('Error in initial active jobs check:', error);
    });
  }

  /**
   * Monitor for new jobs
   */
  async monitorNewJobs() {
    if (!this.initialized) await this.initialize();
    
    try {
      // Get latest job count
      const jobCount = await connector.marketplace.jobsLength();
      console.log(`Found ${jobCount} total jobs`);
      
      // Get the latest few jobs (could be configurable)
      const latestJobCount = 10;
      const startIdx = Math.max(0, Number(jobCount) - latestJobCount);
      
      console.log(`Checking jobs ${startIdx} to ${Number(jobCount) - 1}`);
      
      // Get jobs
      const jobs = await connector.getJobs(startIdx);
      
      // Process each job
      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error('Error monitoring new jobs:', error);
      throw error;
    }
  }

  /**
   * Stop job monitoring
   */
  stopJobMonitoring() {
    if (this.jobMonitoringInterval) {
      clearInterval(this.jobMonitoringInterval);
      this.jobMonitoringInterval = null;
    }
    
    if (this.activeJobsMonitoringInterval) {
      clearInterval(this.activeJobsMonitoringInterval);
      this.activeJobsMonitoringInterval = null;
    }
    
    console.log('Job monitoring stopped');
  }
}

// Create and export a singleton instance
const agentManager = new AgentManager();
module.exports = agentManager;