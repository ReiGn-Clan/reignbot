// Require the 'fs' and 'path' modules
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const xp = require('discord-xp');

const mongo_uri = `mongodb+srv://admin:0mJPeNCsVKfjJ80n@reignbot.bcvxwha.mongodb.net/xpDatabase`; //set uri for mongoDB
mongoose.connect(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true}) //connect to mongoDB
  .then(() =>{
    console.log('Connected to MongoDB server');

    const xpCollection = mongoose.connection.db.collection('xpCollection');

    console.log(xpCollection);
  })
  .catch((err) => {
    console.log('Failed to connect to MongoDB: ', err);
});

// Require the 'Client', 'Collection', 'Events', and 'GatewayIntentBits' objects from the 'discord.js' module
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');

// Require the 'token' property from the 'config.json' file
const { token } = require('./config.json');

// Create a new instance of the 'Client' object with the necessary intents enabled
const client = new Client({ 
  intents: 
    [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers], 
});

// Create a new Collection to store the commands
client.commands = new Collection();

// Define the path to the 'commands' directory
const commandsPath = path.join(__dirname, 'commands');

// Get an array of all JavaScript files in the 'commands' directory
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Loop through each command file and add it to the Collection
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// When the client is ready, log a message to the console
client.once(Events.ClientReady, () => {
  console.log('Ready!');
});

// Listen for interactions (i.e. commands) and execute the appropriate command
client.on(Events.InteractionCreate, async interaction => {
  // Ignore interactions that are not chat input commands
  if (!interaction.isChatInputCommand()) return;

  // Ignore interactions that are not commands
  if (!interaction.isCommand()) return;

  // Log the command usage to the console
  const { commandName, user } = interaction;
  const timestamp = new Date().toLocaleString();
  console.log(`[${timestamp}] ${user.username} used command /${commandName}`);

  // Get the appropriate command from the Collection and execute it
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    // If there is an error, send an error message to the user
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

client.on("messageCreate", function(message){
  //if the message starts with the command prefix or if the author is the bot, skip this method
  if (message.content.startsWith("/") || message.author.bot) {
    return;
  }

  const timestamp = new Date().toLocaleString();
  console.log(`[${timestamp}] ${message.author.username}: ${message.content}`);
});

// Log the client in using the token from the config file
client.login(token); 