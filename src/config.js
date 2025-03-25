// src/config.js
require('dotenv').config();
const { ethers } = require('ethers');

/**
 * Configuration module for EACC Agent Framework
 * Loads and validates all environment variables
 */
class Config {
  constructor() {
    this.loadConfig();
    this.validateConfig();
  }

  /**
   * Load configuration from environment variables
   */
  loadConfig() {
    // Blockchain configuration
    this.rpcUrl = process.env.RPC_URL;
    this.privateKey = process.env.PRIVATE_KEY;
    this.marketplaceAddress = process.env.MARKETPLACE_ADDRESS;
    this.marketplaceDataAddress = process.env.MARKETPLACE_DATA_ADDRESS;

    // IPFS configuration
    this.ipfsApiUrl = process.env.IPFS_API_URL || 'https://api.pinata.cloud';
    this.ipfsApiKey = process.env.IPFS_API_KEY;
    this.ipfsApiSecret = process.env.IPFS_API_SECRET;
    this.ipfsGatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/';
    
    // Add Pinata-specific configuration
    this.pinataMetadataTemplate = {
      name: `eacc-agent-${Date.now()}`,
      keyvalues: {
        service: 'eacc-agent',
        type: 'job-communication'
      }
    };
    
    // Alternative IPFS gateways
    this.ipfsGateways = [
      this.ipfsGatewayUrl,
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/',
      'https://ipfs.io/ipfs/'
    ];

    // Agent configuration
    this.agentName = process.env.AGENT_NAME || 'EACC Agent';
    this.agentBio = process.env.AGENT_BIO || 'AI agent for the EACC marketplace';
    this.agentAvatar = process.env.AGENT_AVATAR || '';

    // Enabled agents
    this.enabledAgents = (process.env.ENABLED_AGENTS || '')
      .split(',')
      .map(agent => agent.trim())
      .filter(Boolean);

    // Job polling intervals
    this.jobPollInterval = parseInt(process.env.JOB_POLL_INTERVAL || '60000', 10);
    this.activeJobsPollInterval = parseInt(process.env.ACTIVE_JOBS_POLL_INTERVAL || '120000', 10);

    // Relevant tags
    this.relevantTags = (process.env.RELEVANT_TAGS || 'bot,automation')
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    // Agent-specific configuration
    this.agentConfig = {};

    // Discord bot configuration
    if (this.enabledAgents.includes('discord-bot')) {
      this.agentConfig['discord-bot'] = {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID
      };
    }

    // Telegram bot configuration
    if (this.enabledAgents.includes('telegram-bot')) {
      this.agentConfig['telegram-bot'] = {
        token: process.env.TELEGRAM_BOT_TOKEN
      };
    }

    // Twitter bot configuration
    if (this.enabledAgents.includes('twitter-bot')) {
      this.agentConfig['twitter-bot'] = {
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET
      };
    }

    // Logging configuration
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  /**
   * Validate critical configuration values
   * @throws {Error} if critical configuration is missing
   */
  validateConfig() {
    const requiredBlockchainConfig = [
      'rpcUrl',
      'privateKey',
      'marketplaceAddress',
      'marketplaceDataAddress'
    ];

    const missingBlockchainConfig = requiredBlockchainConfig.filter(key => !this[key]);

    if (missingBlockchainConfig.length > 0) {
      throw new Error(`Missing required blockchain configuration: ${missingBlockchainConfig.join(', ')}`);
    }

    // Validate that at least one agent is enabled
    if (this.enabledAgents.length === 0) {
      throw new Error('No agents enabled. Set ENABLED_AGENTS in .env file.');
    }

    // Validate agent-specific configuration
    this.enabledAgents.forEach(agent => {
      if (!this.agentConfig[agent]) {
        throw new Error(`Missing configuration for enabled agent: ${agent}`);
      }

      // Discord bot validation
      if (agent === 'discord-bot') {
        if (!this.agentConfig[agent].token) {
          throw new Error('Missing DISCORD_TOKEN for discord-bot agent');
        }
      }

      // Telegram bot validation
      if (agent === 'telegram-bot') {
        if (!this.agentConfig[agent].token) {
          throw new Error('Missing TELEGRAM_BOT_TOKEN for telegram-bot agent');
        }
      }

      // Twitter bot validation
      if (agent === 'twitter-bot') {
        const required = ['apiKey', 'apiSecret', 'accessToken', 'accessSecret'];
        const missing = required.filter(key => !this.agentConfig[agent][key]);
        if (missing.length > 0) {
          throw new Error(`Missing Twitter configuration for twitter-bot agent: ${missing.join(', ')}`);
        }
      }
    });
  }

  /**
   * Get Ethereum provider
   * @returns {ethers.JsonRpcProvider} Provider instance
   */
  getProvider() {
    return new ethers.JsonRpcProvider(this.rpcUrl);
  }

  /**
   * Get Ethereum wallet
   * @returns {ethers.Wallet} Wallet instance
   */
  getWallet() {
    const provider = this.getProvider();
    return new ethers.Wallet(this.privateKey, provider);
  }
}

// Create and export a singleton instance
const config = new Config();
module.exports = config;