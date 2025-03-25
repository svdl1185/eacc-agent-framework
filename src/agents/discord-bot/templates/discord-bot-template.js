// Discord Bot Template
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
      content: 'Here are the available commands:\n' +
               '/ping - Check if the bot is running\n' +
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
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  
  try {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const commands = Array.from(client.commands.values()).map(command => command.data.toJSON());
    
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    
    // Register commands globally
    const data = await rest.put(
      Routes.applicationCommands(readyClient.user.id),
      { body: commands },
    );
    
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

// Handle interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}`);
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
        'Here are the available commands:\n' +
        '!ping - Check if the bot is running\n' +
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
client.login(process.env.DISCORD_TOKEN);