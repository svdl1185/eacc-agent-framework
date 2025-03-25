// src/base-agent/index.js
/**
 * Base class for all EACC agents
 * All specialized agents should extend this class
 */
class BaseAgent {
    /**
     * Constructor
     * @param {Object} options - Agent options
     */
    constructor(options = {}) {
      this.name = options.name || 'Generic Agent';
      this.description = options.description || 'A generic EACC agent';
      this.tags = options.tags || [];
      this.activeJobs = new Map(); // Map of job IDs to job objects
    }
  
    /**
     * Initialize the agent
     * Should be implemented by specialized agents
     */
    async initialize() {
      throw new Error('Method not implemented');
    }
  
    /**
     * Check if a job matches this agent's capabilities
     * @param {Object} job - Job object
     * @param {string} content - Job content
     * @returns {boolean} - True if the job is relevant to this agent
     */
    isJobMatch(job, content) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Create an application message for a job
     * @param {Object} job - Job object
     * @param {string} content - Job content
     * @returns {string} - Application message
     */
    createApplicationMessage(job, content) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Execute a job
     * @param {Object} job - Job object
     * @param {string} content - Job content
     * @returns {string} - Result content
     */
    async executeJob(job, content) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Estimate completion time for a job
     * @param {Object} job - Job object
     * @param {string} content - Job content
     * @returns {string} - Estimated completion time (e.g., "2 days")
     */
    estimateCompletionTime(job, content) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Assess the complexity of a job
     * @param {Object} job - Job object
     * @param {string} content - Job content
     * @returns {string} - Complexity level ('low', 'medium', 'high')
     */
    assessComplexity(job, content) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Package the job result
     * @param {Object} job - Job object
     * @param {string} content - Job content
     * @param {any} result - Raw job result
     * @returns {string} - Packaged result content
     */
    packageResult(job, content, result) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Add a job to the active jobs
     * @param {Object} job - Job object
     * @param {string} content - Job content
     */
    addActiveJob(job, content) {
      this.activeJobs.set(job.id, {
        job,
        content,
        startTime: new Date(),
        status: 'started'
      });
    }
    
    /**
     * Update active job status
     * @param {number} jobId - Job ID
     * @param {string} status - New status
     * @param {any} data - Additional data
     */
    updateActiveJob(jobId, status, data = null) {
      if (!this.activeJobs.has(jobId)) {
        throw new Error(`Job ${jobId} is not active`);
      }
      
      const jobInfo = this.activeJobs.get(jobId);
      jobInfo.status = status;
      
      if (data) {
        jobInfo.data = data;
      }
      
      this.activeJobs.set(jobId, jobInfo);
    }
    
    /**
     * Get active job
     * @param {number} jobId - Job ID
     * @returns {Object} - Active job info
     */
    getActiveJob(jobId) {
      return this.activeJobs.get(jobId);
    }
    
    /**
     * Remove a job from active jobs
     * @param {number} jobId - Job ID
     */
    removeActiveJob(jobId) {
      this.activeJobs.delete(jobId);
    }
  }
  
  module.exports = BaseAgent;