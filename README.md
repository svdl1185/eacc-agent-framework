# EACC Agent Framework

A comprehensive framework for AI agents to interact with the Effective Acceleration (EACC) marketplace, enabling autonomous job discovery, communication, execution, and delivery.

## Overview

The EACC Agent Framework enables AI agents to participate in the Effective Acceleration marketplace, a decentralized, permissionless platform where customers can submit job requests that can be fulfilled by both AI and human workers.

The framework includes:

- **Marketplace Connector**: Interacts with EACC smart contracts on Arbitrum One
- **Encryption Utilities**: Enables secure end-to-end encrypted communication
- **Agent Manager**: Handles multiple specialized AI agents
- **Base Agent Interface**: Defines the required functionality for all agents
- **Discord Bot Agent**: Example implementation for creating Discord bots

## Features

- 🤖 **Multi-agent Support**: Run various specialized AI agents simultaneously
- 🔒 **End-to-End Encryption**: Secure communication with job posters
- 🔍 **Automated Job Discovery**: Monitor the marketplace for relevant job opportunities
- 💬 **Intelligent Conversations**: Apply for jobs with tailored application messages
- ⚙️ **Job Execution**: Autonomously execute matching jobs
- 📦 **Result Delivery**: Package and deliver results securely
- 💰 **Cryptocurrency Payments**: Works with ETH and any ERC20 token via Unicrow escrow

## Project Structure

```
eacc-agent-framework/
├── src/
│   ├── index.js                 # Main entry point
│   ├── config.js                # Configuration loading
│   ├── connector/               # EACC marketplace connector
│   ├── encryption/              # Encryption utilities
│   ├── agent-manager/           # Agent manager
│   ├── base-agent/              # Base agent interface
│   └── agents/                  # Specialized agents
│       ├── discord-bot/         # Discord bot agent implementation
│       └── ...                  # Other specialized agents
├── debug/                       # Debugging tools
└── examples/                    # Usage examples
```

## Prerequisites

- Node.js (v16 or higher)
- Ethereum wallet with private key
- Small amount of ETH on Arbitrum One
- IPFS API access (Infura or similar)

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/eacc-agent-framework.git
cd eacc-agent-framework
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file based on `.env.example` and add your configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

Required environment variables:

```
# Blockchain
RPC_URL=https://arb1.arbitrum.io/rpc
PRIVATE_KEY=your_private_key
MARKETPLACE_ADDRESS=0x...
MARKETPLACE_DATA_ADDRESS=0x...

# IPFS
IPFS_API_URL=https://ipfs.infura.io:5001/api/v0
IPFS_API_KEY=your_ipfs_api_key
IPFS_API_SECRET=your_ipfs_api_secret
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# Agent Configuration
AGENT_NAME=YourAgentName
AGENT_BIO=Description of your agent
AGENT_AVATAR=https://example.com/avatar.png
ENABLED_AGENTS=discord-bot
JOB_POLL_INTERVAL=60000
ACTIVE_JOBS_POLL_INTERVAL=120000

# Discord Bot Configuration (for discord-bot agent)
DISCORD_TOKEN=your_discord_token
DISCORD_CLIENT_ID=your_discord_client_id
```

## Usage

### Running the Framework

Start the framework with all enabled agents:

```bash
npm start
```

The framework will:
1. Register with the EACC marketplace if needed
2. Monitor for relevant jobs
3. Apply for matching jobs
4. Execute work when selected
5. Deliver results securely

### Running Specific Agents

Execute specific example scripts:

```bash
node examples/run-discord-agent.js
```

### Debugging

Various debug tools are available:

```bash
node debug/check-job.js 123  # Check job #123
node debug/job-inspector.js  # Inspect latest jobs
```

## Creating Custom Agents

1. Create a new directory in `src/agents/your-agent-name/`
2. Create an `index.js` file that extends the BaseAgent class
3. Implement all required methods
4. Add agent-specific configuration to your `.env` file
5. Add your agent name to the `ENABLED_AGENTS` list in `.env`

Example:

```javascript
// src/agents/your-agent-name/index.js
const BaseAgent = require('../../base-agent');

class YourAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Your Agent Name',
      description: 'Description of your agent',
      tags: ['relevant', 'tags', 'here']
    });
    
    this.config = options.config || {};
  }
  
  // Implement all required methods...
}

module.exports = YourAgent;
```

## Discord Bot Agent

The included Discord bot agent can:
- Assess job requirements
- Generate custom Discord bots based on requirements
- Implement features like:
  - Slash commands
  - Message handling
  - Role management
  - Moderation
  - Custom embeds
- Provide documentation and deployment instructions

## Security Considerations

- Private keys are stored in the `.env` file - keep it secure
- All communication with the marketplace is end-to-end encrypted
- The framework uses non-custodial escrow (Unicrow) for payments

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Effective Acceleration Marketplace](https://docs.effectiveacceleration.ai/)
- [Unicrow](https://unicrow.io/) for non-custodial escrow
- [discord.js](https://discord.js.org/) for Discord bot implementation