// src/connector/index.js
const { ethers } = require('ethers');
const config = require('../config');
const encryption = require('../encryption');

// ABI imports (simplified versions)
const MarketplaceV1ABI = [
  "function jobsLength() view returns (uint256)",
  "function getJob(uint256 jobId_) view returns (tuple(uint8 state, bool whitelistWorkers, tuple(address creator, address arbitrator, address worker) roles, string title, string[] tags, bytes32 contentHash, bool multipleApplicants, uint256 amount, address token, uint32 timestamp, uint32 maxTime, string deliveryMethod, uint256 collateralOwed, uint256 escrowId, bytes32 resultHash, uint8 rating, bool disputed))",
  "function postThreadMessage(uint256 jobId_, bytes32 contentHash_, address recipient) external",
  "function takeJob(uint256 jobId_, bytes signature_) external",
  "function deliverResult(uint256 jobId_, bytes32 resultHash_) external"
];

const MarketplaceDataV1ABI = [
  "function registerUser(bytes pubkey_, string name_, string bio_, string avatar_) external",
  "function users(address) view returns (address, bytes, string, string, string, uint16, uint16)",
  "function userRegistered(address) view returns (bool)",
  "function publicKeys(address) view returns (bytes)",
  "function eventsLength(uint256 jobId_) view returns (uint256)",
  "function publishJobEvent(uint256 jobId_, tuple(uint8 type_, bytes address_, bytes data_, uint32 timestamp_) event_) external"
];

/**
 * Connector for interacting with the EACC marketplace
 */
class EACCConnector {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.marketplace = null;
    this.marketplaceData = null;
    this.initialized = false;
    this.processedJobs = new Set(); // Track processed jobs
  }

  /**
   * Initialize the connector
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize provider and wallet
      this.provider = config.getProvider();
      this.wallet = config.getWallet();

      // Initialize contract instances
      this.marketplace = new ethers.Contract(
        config.marketplaceAddress,
        MarketplaceV1ABI,
        this.wallet
      );

      this.marketplaceData = new ethers.Contract(
        config.marketplaceDataAddress,
        MarketplaceDataV1ABI,
        this.wallet
      );

      // Check if the agent is registered
      const isRegistered = await this.marketplaceData.userRegistered(this.wallet.address);
      
      if (!isRegistered) {
        await this.registerAgent();
      }
      
      console.log(`Agent initialized with address: ${this.wallet.address}`);
      this.initialized = true;
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register the agent as a user on EACC
   * @private
   */
  async registerAgent() {
    try {
      // Get encryption signing key
      const signingKey = await encryption.getEncryptionSigningKey(this.wallet);
      
      // Register user with the marketplace
      const tx = await this.marketplaceData.registerUser(
        signingKey.compressedPublicKey,
        config.agentName,
        config.agentBio,
        config.agentAvatar
      );
      
      await tx.wait();
      console.log('Agent registered successfully!');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Get all jobs from the marketplace
   * @param {number} startIdx - Starting index (default: 0)
   * @param {number} count - Number of jobs to retrieve (default: all)
   * @returns {Array} - Array of job objects
   */
  async getJobs(startIdx = 0, count = 0) {
    if (!this.initialized) await this.initialize();
    
    try {
      const jobCount = await this.marketplace.jobsLength();
      const totalJobs = Number(jobCount);
      
      // If count is 0 or greater than available jobs, retrieve all jobs
      const endIdx = count === 0 ? totalJobs : Math.min(startIdx + count, totalJobs);
      
      const jobs = [];
      for (let i = startIdx; i < endIdx; i++) {
        try {
          const jobData = await this.marketplace.getJob(i);
          
          // Debug: Log the raw job data to see its structure
          console.log(`Job ${i} raw data structure:`, 
            Object.keys(jobData).length > 0 ? 'Has properties' : 'No properties');
          
          // In ethers v6, tuples are often returned as arrays with numeric indices
          // We need to map these to named properties
          const job = {
            id: i,
            title: jobData[3] || `Job #${i}`, // title is often the 4th element (index 3)
            state: Number(jobData[0]) || 0,   // state is often the 1st element (index 0)
            roles: {
              creator: jobData[2]?.creator || this.wallet.address,
              arbitrator: jobData[2]?.arbitrator || ethers.ZeroAddress,
              worker: jobData[2]?.worker || ethers.ZeroAddress
            },
            multipleApplicants: Boolean(jobData[6]),  // multipleApplicants
            tags: Array.isArray(jobData[4]) ? jobData[4] : [],  // tags
            contentHash: jobData[5] || '0x0000000000000000000000000000000000000000000000000000000000000000', // contentHash
            amount: jobData[7] || 0,  // amount
            token: jobData[8] || ethers.ZeroAddress,  // token
          };
          
          // Log the processed job
          console.log(`Job ${i} processed:`, {
            id: job.id,
            title: job.title,
            state: job.state,
            tags: job.tags,
            multipleApplicants: job.multipleApplicants,
          });
          
          jobs.push(job);
        } catch (error) {
          console.error(`Error fetching job ${i}:`, error.message);
        }
      }
      
      return jobs;
    } catch (error) {
      console.error('Error getting jobs:', error);
      throw error;
    }
  }

  /**
   * Get a specific job from the marketplace
   * @param {number} jobId - Job ID
   * @returns {Object} - Job object
   */
  async getJob(jobId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const job = await this.marketplace.getJob(jobId);
      
      // Add job ID to the job object
      return {
        ...job,
        id: jobId
      };
    } catch (error) {
      console.error(`Error fetching job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get job content from IPFS
   * @param {Object} job - Job object
   * @returns {string} - Job content
   */
  async getJobContent(job) {
    if (!job.contentHash || job.contentHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return '';
    }
    
    try {
      const contentCid = encryption.hashToCid(job.contentHash);
      console.log(`Fetching content for job ${job.id} with CID: ${contentCid}`);
      
      const content = await encryption.getFromIpfs(contentCid);
      return content;
    } catch (error) {
      console.error(`Error getting content for job ${job.id}:`, error);
      return ''; // Return empty content on error
    }
  }

  /**
   * Check if a job matches the agent's criteria
   * @param {Object} job - Job object
   * @param {string} content - Job content
   * @returns {boolean} - True if the job is relevant
   */
  isRelevantJob(job, content) {
    console.log(`Evaluating job ${job.id}:`);
    console.log(`- Title: ${job.title || 'undefined'}`);
    console.log(`- State: ${job.state}`);
    console.log(`- Tags: ${job.tags ? job.tags.join(', ') : 'none'}`);
    
    // Check job state - only open jobs (state === 0) are relevant
    if (job.state !== 0) {
      console.log(`- Job ${job.id} is not open (state: ${job.state}), skipping`);
      return false;
    }
    
    // Check if job is already processed
    if (this.processedJobs.has(job.id)) {
      console.log(`- Job ${job.id} already processed, skipping`);
      return false;
    }
    
    // Check job title for relevant keywords
    if (job.title) {
      const titleMatches = config.relevantTags.some(tag => 
        job.title.toLowerCase().includes(tag.toLowerCase())
      );
      
      if (titleMatches) {
        console.log(`- Job ${job.id} matches by title: ${job.title}`);
        return true;
      }
    }
    
    // Check job tags for relevant keywords
    if (job.tags && job.tags.length > 0) {
      const tagMatches = job.tags.some(tag => 
        config.relevantTags.some(relevantTag => 
          tag.toLowerCase().includes(relevantTag.toLowerCase())
        )
      );
      
      if (tagMatches) {
        console.log(`- Job ${job.id} matches by tags: ${job.tags.join(', ')}`);
        return true;
      }
    }
    
    // Check job content for relevant keywords
    if (content) {
      const contentMatches = config.relevantTags.some(tag => 
        content.toLowerCase().includes(tag.toLowerCase())
      );
      
      if (contentMatches) {
        console.log(`- Job ${job.id} matches by content`);
        return true;
      }
    }
    
    console.log(`- Job ${job.id} is not relevant, skipping`);
    return false;
  }

  /**
   * Apply for a job
   * @param {number} jobId - Job ID
   * @param {string} applicationMessage - Application message
   */
  async applyForJob(jobId, applicationMessage) {
    if (!this.initialized) await this.initialize();
    
    try {
      const job = await this.getJob(jobId);
      const owner = job.roles.creator;
      
      // Get owner's public key for encryption
      const ownerPublicKey = await this.marketplaceData.publicKeys(owner);
      
      if (!ownerPublicKey || ownerPublicKey === '0x') {
        throw new Error(`Owner public key not available for job ${jobId}`);
      }
      
      // Generate session key for secure communication
      const sessionKey = await encryption.getSessionKey(this.wallet, ownerPublicKey, jobId);
      
      // Publish the application to IPFS
      console.log(`Publishing application for job ${jobId} to IPFS...`);
      const { hash } = await encryption.publishToIpfs(applicationMessage, sessionKey);
      console.log(`Application published with hash: ${hash}`);
      
      // Convert hash to bytes32 format
      const contentHashBytes = ethers.keccak256(ethers.toUtf8Bytes(hash));
      
      // Post thread message
      console.log(`Posting thread message for job ${jobId}...`);
      const tx = await this.marketplace.postThreadMessage(jobId, contentHashBytes, owner);
      await tx.wait();
      
      console.log(`Successfully applied for job ${jobId}`);
      
      // Mark job as processed
      this.processedJobs.add(jobId);
      
      return true;
    } catch (error) {
      console.error(`Error applying for job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Take a job (for non-multipleApplicants jobs)
   * @param {number} jobId - Job ID
   * @returns {boolean} - Success status
   */
  async takeJob(jobId) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Get the events length (revision)
      const revision = await this.marketplaceData.eventsLength(jobId);
      
      // Create and sign the message
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [revision, jobId])
      );
      
      const messageBytes = ethers.getBytes(messageHash);
      const signature = await this.wallet.signMessage(messageBytes);
      
      // Take the job
      const tx = await this.marketplace.takeJob(jobId, signature);
      await tx.wait();
      
      console.log(`Successfully took job ${jobId}`);
      
      // Mark job as processed
      this.processedJobs.add(jobId);
      
      return true;
    } catch (error) {
      console.error(`Error taking job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Deliver job result
   * @param {number} jobId - Job ID
   * @param {string} resultContent - Result content
   * @returns {boolean} - Success status
   */
  async deliverResult(jobId, resultContent) {
    if (!this.initialized) await this.initialize();
    
    try {
      const job = await this.getJob(jobId);
      
      // Get owner's public key for encryption
      const owner = job.roles.creator;
      const ownerPublicKey = await this.marketplaceData.publicKeys(owner);
      const sessionKey = await encryption.getSessionKey(this.wallet, ownerPublicKey, jobId);
      
      // Publish the result to IPFS
      const { hash } = await encryption.publishToIpfs(resultContent, sessionKey);
      
      // Convert hash to bytes32 format
      const resultHashBytes = ethers.keccak256(ethers.toUtf8Bytes(hash));
      
      // Deliver the result
      const tx = await this.marketplace.deliverResult(jobId, resultHashBytes);
      await tx.wait();
      
      console.log(`Successfully delivered result for job ${jobId}`);
      return true;
    } catch (error) {
      console.error(`Error delivering result for job ${jobId}:`, error);
      return false;
    }
  }
}

// Create and export a singleton instance
const connector = new EACCConnector();
module.exports = connector;