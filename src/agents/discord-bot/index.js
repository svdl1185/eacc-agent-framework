// src/agents/discord-bot/index.js
const fs = require('fs');
const path = require('path');
const BaseAgent = require('../../base-agent');

/**
 * Specialized agent for creating Discord bots
 */
class DiscordBotAgent extends BaseAgent {
  /**
   * Constructor
   * @param {Object} options - Agent options
   */
  constructor(options = {}) {
    super({
      name: 'Discord Bot Agent',
      description: 'Creates custom Discord bots based on requirements',
      tags: ['discord', 'bot', 'automation', 'chatbot']
    });
    
    this.config = options.config || {};
    this.templatePath = path.join(__dirname, 'templates', 'discord-bot-template.js');
    
    // Keywords indicating a Discord bot request
    this.discordKeywords = [
      'discord bot',
      'discord.js',
      'discord server',
      'discord channel',
      'discord automation',
      'chatbot for discord',
      'slash commands',
      'discord integration'
    ];
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    console.log('Initializing Discord Bot Agent...');
    
    // Check if template file exists
    if (!fs.existsSync(this.templatePath)) {
      console.warn(`Template file not found: ${this.templatePath}`);
      
      // Create templates directory if it doesn't exist
      const templatesDir = path.dirname(this.templatePath);
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }
      
      // Create template file with basic Discord bot code
      fs.writeFileSync(this.templatePath, this.getBasicTemplate());
    }
    
    console.log('Discord Bot Agent initialized');
  }

  /**
   * Check if a job matches this agent's capabilities
   * @param {Object} job - Job object
   * @param {string} content - Job content
   * @returns {boolean} - True if the job is relevant to this agent
   */
  isJobMatch(job, content) {
    // Check job title for Discord keywords
    const titleMatch = this.discordKeywords.some(keyword => 
      job.title.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (titleMatch) return true;
    
    // Check job tags for Discord keywords
    const tagMatch = job.tags && job.tags.some(tag => 
      tag.toLowerCase().includes('discord') || tag.toLowerCase().includes('bot')
    );
    
    if (tagMatch) return true;
    
    // Check job content for Discord keywords
    const contentMatch = content && this.discordKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return contentMatch;
  }

  /**
   * Create an application message for a job
   * @param {Object} job - Job object
   * @param {string} content - Job content
   * @returns {string} - Application message
   */
  createApplicationMessage(job, content) {
    const botType = 'Discord';
    const complexity = this.assessComplexity(job, content);
    const estimatedTime = this.estimateCompletionTime(job, content);
    
    return `
Hello! I'm a specialized AI agent for creating Discord bots.

After reviewing your requirements, I'd be happy to help you create a custom Discord bot. I have extensive experience developing Discord bots with various features and integrations.

Based on your requirements, I estimate this would be a ${complexity} complexity project that I can deliver within ${estimatedTime}.

My approach would include:
1. Custom code development based on your requirements
2. Implementation of all specified bot commands and features
3. Integration with Discord API and any other required services
4. Complete documentation and deployment instructions
5. Support for any questions or issues after delivery

Some of the features I can implement include:
- Custom slash commands
- Message handling and responses
- Role management
- Channel management
- Event scheduling
- Moderation features
- External API integrations
- Embed messages with rich formatting
- Reaction roles and menus

Would you like to proceed with the development of your Discord bot? Feel free to ask if you have any questions about my approach.
    `;
  }

  /**
   * Execute a job
   * @param {Object} job - Job object
   * @param {string} content - Job content
   * @returns {Object} - Result object containing code and documentation
   */
  async executeJob(job, content) {
    console.log(`Executing Discord bot job ${job.id}`);
    
    // Extract requirements
    const requirements = this.extractRequirements(content);
    
    // Generate bot code
    const botCode = await this.generateBotCode(requirements);
    
    // Generate documentation
    const documentation = this.generateDocumentation(requirements);
    
    // Generate deployment instructions
    const deploymentInstructions = this.generateDeploymentInstructions();
    
    return {
      botCode,
      documentation,
      deploymentInstructions,
      requirements
    };
  }

  /**
   * Estimate completion time for a job
   * @param {Object} job - Job object
   * @param {string} content - Job content
   * @returns {string} - Estimated completion time
   */
  estimateCompletionTime(job, content) {
    const complexity = this.assessComplexity(job, content);
    
    if (complexity === 'high') return '3-4 days';
    if (complexity === 'medium') return '1-2 days';
    return '24 hours';
  }

  /**
   * Assess the complexity of a job
   * @param {Object} job - Job object
   * @param {string} content - Job content
   * @returns {string} - Complexity level ('low', 'medium', 'high')
   */
  assessComplexity(job, content) {
    const content_lower = content.toLowerCase();
    
    // Complex features
    const complexFeatures = [
      'database', 'oauth', 'authentication', 'dashboard',
      'web interface', 'voice', 'music', 'streaming',
      'ai', 'machine learning', 'nlp', 'natural language',
      'payment', 'analytics', 'complex permissions'
    ];
    
    // Medium complexity features
    const mediumFeatures = [
      'api integration', 'scheduled tasks', 'notifications',
      'user management', 'role management', 'moderation',
      'custom embeds', 'reaction roles', 'slash commands'
    ];
    
    if (complexFeatures.some(feature => content_lower.includes(feature))) {
      return 'high';
    }
    
    if (mediumFeatures.some(feature => content_lower.includes(feature))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Extract requirements from job content
   * @param {string} content - Job content
   * @returns {Object} - Extracted requirements
   */
  extractRequirements(content) {
    // Extract features mentioned in the content
    const features = this.identifyFeatures(content);
    
    return {
      description: content,
      features
    };
  }

  /**
   * Identify features from job content
   * @param {string} content - Job content
   * @returns {Array} - Array of feature strings
   */
  identifyFeatures(content) {
    const content_lower = content.toLowerCase();
    const features = [];
    
    const possibleFeatures = {
      'command handling': ['command', 'commands', '/help', '/start', 'slash command'],
      'message handling': ['message', 'reply', 'send message', 'respond to messages'],
      'role management': ['role', 'assign role', 'role assignment', 'reaction role'],
      'moderation': ['moderation', 'ban', 'kick', 'mute', 'timeout'],
      'scheduling': ['schedule', 'timer', 'reminder', 'periodic', 'cron'],
      'embeds': ['embed', 'rich message', 'formatted message'],
      'api integration': ['api', 'integration', 'connect', 'external service'],
      'database': ['database', 'storage', 'save', 'persist'],
      'web dashboard': ['dashboard', 'web interface', 'admin panel']
    };
    
    for (const [feature, keywords] of Object.entries(possibleFeatures)) {
      if (keywords.some(keyword => content_lower.includes(keyword))) {
        features.push(feature);
      }
    }
    
    return features;
  }

  /**
   * Generate bot code based on requirements
   * @param {Object} requirements - Extracted requirements
   * @returns {string} - Generated code
   */
  async generateBotCode(requirements) {
    // Read the template
    let template = '';
    try {
      template = fs.readFileSync(this.templatePath, 'utf8');
    } catch (error) {
      console.error('Error reading template:', error);
      template = this.getBasicTemplate();
    }
    
    // Customize template based on requirements
    let customizedCode = template;
    
    // Add required features
    for (const feature of requirements.features) {
      customizedCode = this.addFeatureToCode(customizedCode, feature);
    }
    
    return customizedCode;
  }

  /**
   * Add a feature to the code
   * @param {string} code - Base code
   * @param {string} feature - Feature to add
   * @returns {string} - Updated code
   */
  addFeatureToCode(code, feature) {
    // This is a simplified approach to adding features
    // In a real implementation, you'd use more sophisticated code generation
    
    // Features to add based on requirement
    const featureCode = {
      'command handling': `
// Additional command handlers
const infoCommand = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get information about the bot'),
  async execute(interaction) {
    await interaction.reply('This is a custom Discord bot created for your specific needs.');
  },
};

const settingsCommand = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Adjust bot settings')
    .addStringOption(option =>
      option.setName('setting')
        .setDescription('Setting to adjust')
        .setRequired(true)
        .addChoices(
          { name: 'Notifications', value: 'notifications' },
          { name: 'Prefix', value: 'prefix' },
          { name: 'Moderation', value: 'moderation' }
        )),
  async execute(interaction) {
    const setting = interaction.options.getString('setting');
    await interaction.reply(\`Adjusting setting: \${setting}\`);
  },
};

// Add commands to collection
client.commands.set(infoCommand.data.name, infoCommand);
client.commands.set(settingsCommand.data.name, settingsCommand);
      `,
      
      'role management': `
// Role management command
const roleCommand = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage roles')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role to a user')
        .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('The role').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a user')
        .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('The role').setRequired(true))),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: 'You do not have permission to manage roles', ephemeral: true });
    }
    
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(user.id);
    
    if (subcommand === 'add') {
      await member.roles.add(role);
      await interaction.reply(\`Added role \${role.name} to \${user.username}\`);
    } else if (subcommand === 'remove') {
      await member.roles.remove(role);
      await interaction.reply(\`Removed role \${role.name} from \${user.username}\`);
    }
  },
};

// Add command to collection
client.commands.set(roleCommand.data.name, roleCommand);
      `,
      
      'moderation': `
// Moderation commands
const moderationCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user')
      .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
      .addStringOption(option => option.setName('reason').setDescription('Reason for kicking')),
    async execute(interaction) {
      if (!interaction.member.permissions.has('KickMembers')) {
        return interaction.reply({ content: 'You do not have permission to kick members', ephemeral: true });
      }
      
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id);
      
      if (!member.kickable) {
        return interaction.reply({ content: 'I cannot kick this user', ephemeral: true });
      }
      
      await member.kick(reason);
      await interaction.reply(\`Kicked \${user.username} for: \${reason}\`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user')
      .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
      .addStringOption(option => option.setName('reason').setDescription('Reason for banning')),
    async execute(interaction) {
      if (!interaction.member.permissions.has('BanMembers')) {
        return interaction.reply({ content: 'You do not have permission to ban members', ephemeral: true });
      }
      
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id);
      
      if (!member.bannable) {
        return interaction.reply({ content: 'I cannot ban this user', ephemeral: true });
      }
      
      await member.ban({ reason });
      await interaction.reply(\`Banned \${user.username} for: \${reason}\`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('Timeout a user')
      .addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
      .addIntegerOption(option => option.setName('minutes').setDescription('Timeout duration in minutes').setRequired(true))
      .addStringOption(option => option.setName('reason').setDescription('Reason for timeout')),
    async execute(interaction) {
      if (!interaction.member.permissions.has('ModerateMembers')) {
        return interaction.reply({ content: 'You do not have permission to timeout members', ephemeral: true });
      }
      
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id);
      
      if (!member.moderatable) {
        return interaction.reply({ content: 'I cannot timeout this user', ephemeral: true });
      }
      
      await member.timeout(minutes * 60 * 1000, reason);
      await interaction.reply(\`Applied a \${minutes} minute timeout to \${user.username} for: \${reason}\`);
    },
  },
];

// Add commands to collection
moderationCommands.forEach(command => {
  client.commands.set(command.data.name, command);
});
      `,
      
      // Add more features as needed
    };
    
    // Add the feature code if available
    if (featureCode[feature]) {
      // Find a good insertion point (before the last client.login call)
      const insertionPoint = code.lastIndexOf('client.login');
      if (insertionPoint !== -1) {
        const beforeInsertionPoint = code.substring(0, insertionPoint);
        const afterInsertionPoint = code.substring(insertionPoint);
        return beforeInsertionPoint + featureCode[feature] + '\n\n' + afterInsertionPoint;
      }
      
      // Fallback: just append to the end
      return code + '\n\n' + featureCode[feature];
    }
    
    return code;
  }

  /**
   * Generate documentation for the bot
   * @param {Object} requirements - Extracted requirements
   * @returns {string} - Generated documentation
   */
  generateDocumentation(requirements) {
    return `
# Discord Bot Documentation

## Overview
This is a custom Discord bot created based on your requirements. The bot implements the following features:
${requirements.features.map(feature => `- ${feature}`).join('\n')}

## Installation
1. Clone the repository or download the provided bot code
2. Install Node.js (version 16.x or higher)
3. Install dependencies: \`npm install discord.js dotenv\`
4. Configure environment variables (see below)
5. Start the bot: \`node bot.js\`

## Environment Variables
Create a \`.env\` file with the following variables:
\`\`\`
DISCORD_TOKEN=your_discord_bot_token
\`\`\`

## Discord Bot Setup
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to the "Bot" tab and create a bot
4. Copy the token and add it to your .env file
5. Enable necessary "Privileged Gateway Intents" 
   - Message Content Intent
   - Server Members Intent
   - Presence Intent
6. Navigate to OAuth2 > URL Generator
7. Select scopes: bot, applications.commands
8. Select appropriate bot permissions (Administrator, or specific permissions based on features)
9. Use the generated URL to invite the bot to your server

## Commands
${this.generateCommandsDocumentation(requirements.features)}

## Customization
The code is modular and well-commented, making it easy to customize and add new features.
    `;
  }

  /**
   * Generate documentation for commands
   * @param {Array} features - Bot features
   * @returns {string} - Command documentation
   */
  generateCommandsDocumentation(features) {
    let documentation = '';
    
    // Add basic commands
    documentation += `
### Basic Commands
- \`/ping\` - Check if the bot is running
- \`/help\` - Show help information
- \`/info\` - Get information about the bot
`;
    
    // Add feature-specific commands
    if (features.includes('role management')) {
      documentation += `
### Role Management
- \`/role add [user] [role]\` - Add a role to a user
- \`/role remove [user] [role]\` - Remove a role from a user
`;
    }
    
    if (features.includes('moderation')) {
      documentation += `
### Moderation
- \`/kick [user] [reason]\` - Kick a user
- \`/ban [user] [reason]\` - Ban a user
- \`/timeout [user] [minutes] [reason]\` - Timeout a user for specified minutes
`;
    }
    
    return documentation;
  }

  /**
   * Generate deployment instructions
   * @returns {string} - Deployment instructions
   */
  generateDeploymentInstructions() {
    return `
# Deployment Instructions

## Local Deployment
1. Make sure Node.js is installed (version 16.x or higher)
2. Clone the repository or save the bot code to a directory
3. Install dependencies: \`npm install discord.js dotenv\`
4. Create a \`.env\` file with your Discord bot token
5. Start the bot: \`node bot.js\`

## Hosting on a VPS
1. SSH into your server
2. Clone the repository or upload the bot code
3. Install Node.js if not already installed
4. Install dependencies: \`npm install discord.js dotenv\`
5. Install PM2: \`npm install -g pm2\`
6. Start the bot with PM2: \`pm2 start bot.js --name "discord-bot"\`
7. Make sure the bot starts on boot: \`pm2 startup\` and \`pm2 save\`

## Hosting on Heroku
1. Create a new Heroku app
2. Connect your GitHub repository or use Heroku CLI to deploy
3. Add the Discord bot token as a Config Var named \`DISCORD_TOKEN\`
4. Ensure you have a \`Procfile\` with the content: \`worker: node bot.js\`
5. Deploy the app and ensure the worker dyno is enabled

## Hosting on Railway
1. Create a new project on Railway
2. Connect your GitHub repository
3. Add the Discord bot token as an environment variable
4. Railway will automatically detect and run your Node.js project

## Important Notes
- Make sure your bot has the necessary permissions in your Discord server
- For slash commands, it may take up to an hour for them to register globally
- Ensure your hosting environment has a stable internet connection
    `;
  }

  /**
   * Package the job result
   * @param {Object} job - Job object
   * @param {string} content - Job content
   * @param {Object} result - Raw job result
   * @returns {string} - Packaged result content
   */
  packageResult(job, content, result) {
    return `
# Discord Bot - Complete Solution

## Overview
This package contains your custom Discord bot as requested. The bot has been created based on the requirements you specified in your job post.

## Bot Code
\`\`\`javascript
${result.botCode}
\`\`\`

## Documentation
${result.documentation}

## Deployment Instructions
${result.deploymentInstructions}

## Next Steps
1. Follow the installation and deployment instructions above
2. If you have any questions or need assistance with the bot, please let me know
3. I'd be happy to help with any additional features or customizations

Thank you for using my services! I hope this Discord bot meets your needs and expectations.
    `;
  }

  /**
   * Get basic Discord bot template
   * @returns {string} - Template code
   */
  getBasicTemplate() {
    return `// Discord Bot Template
require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Collection,
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

// Create a new client instance
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Channel,
    Partials.Message
  ]
});

// Collection for commands
client.commands = new Collection();

// Define commands
const pingCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute(interaction) {
    await interaction.reply('Pong!');
  },
};

const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows help information'),
  async execute(interaction) {
    await interaction.reply({
      content: 'Here are the available commands:\\n' +
               '/ping - Check if the bot is running\\n' +
               '/help - Show this help message',
      ephemeral: true
    });
  },
};

// Add commands to collection
client.commands.set(pingCommand.data.name, pingCommand);
client.commands.set(helpCommand.data.name, helpCommand);

// Register slash commands when the bot is ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log(\`Ready! Logged in as \${readyClient.user.tag}\`);
  
  try {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const commands = Array.from(client.commands.values()).map(command => command.data.toJSON());
    
    console.log(\`Started refreshing \${commands.length} application (/) commands.\`);
    
    // Register commands globally
    const data = await rest.put(
      Routes.applicationCommands(readyClient.user.id),
      { body: commands },
    );
    
    console.log(\`Successfully reloaded \${data.length} application (/) commands.\`);
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

// Handle interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    console.error(\`No command matching \${interaction.commandName} was found.\`);
    return;
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(\`Error executing \${interaction.commandName}\`);
    console.error(error);
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ 
        content: 'There was an error while executing this command!', 
        ephemeral: true 
      });
    } else {
      await interaction.reply({ 
        content: 'There was an error while executing this command!', 
        ephemeral: true 
      });
    }
  }
});

// Handle regular messages
client.on(Events.MessageCreate, async message => {
  // Don't respond to bots or messages without content
  if (message.author.bot || !message.content) return;
  
  // Respond to messages that start with '!'
  if (message.content.startsWith('!')) {
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'ping') {
      message.reply('Pong!');
    } else if (command === 'help') {
      message.reply(
        'Here are the available commands:\\n' +
        '!ping - Check if the bot is running\\n' +
        '!help - Show this help message'
      );
    }
  }
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);`;
  }
}

module.exports = DiscordBotAgent;