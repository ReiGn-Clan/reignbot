const fs = require('node:fs');
const path = require('node:path');
const Levels = require('discord-xp');

const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8'); //read the levelNames JSON
const levelNames = JSON.parse(levelNamesData); //then parse it

const mongo_uri = `mongodb+srv://admin:0mJPeNCsVKfjJ80n@reignbot.bcvxwha.mongodb.net/xpDatabase`; //set uri for mongoDB
Levels.setURL(mongo_uri); //this connects to the database, then sets the URL for the database for the discord-xp library
//NOTE: You don't need to connect to the database in a command file if you need to access it, it's only needed in the main file

// Require the 'Client', 'Collection', 'Events', and 'GatewayIntentBits' objects from the 'discord.js' module
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  GuildMemberRoleManager,
} = require('discord.js');

// Require the 'token' property from the 'config.json' file
const { token } = require('./config.json');

// Create a new instance of the 'Client' object with the necessary intents enabled
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Create a new Collection to store the commands
client.commands = new Collection();

// Define the path to the 'commands' directory
const commandsPath = path.join(__dirname, 'commands');

// Get an array of all JavaScript files in the 'commands' directory
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

// Loop through each command file and add it to the Collection
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// When the client is ready, log a message to the console and connect to mongoDB
client.once(Events.ClientReady, () => {
  console.log('Ready!');
});

// Listen for interactions (i.e. commands) and execute the appropriate command
client.on(Events.InteractionCreate, async (interaction) => {
  // Ignore interactions that are not chat input commands
  if (!interaction.isChatInputCommand()) return;

  // Ignore interactions that are not commands
  if (!interaction.isCommand()) return;

  // Log the command usage to the console
  let { commandName, user } = interaction;
  let timestamp = new Date().toLocaleString();
  console.log(`[${timestamp}] ${user.username} used command /${commandName}`);

  // Get the appropriate command from the Collection and execute it
  let command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    // If there is an error, send an error message to the user
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

client.on('messageCreate', async (message) => {
  //if the message starts with the command prefix or if the author is the bot, skip this method
  if (message.content.startsWith('/') || message.author.bot) {
    return;
  }

  // Here we establish an xpPerMsg variable, then a hasLeveledUp variable
  const xpPerMsg = 150;
  let hasLeveledUp = await Levels.appendXp(
    message.author.id,
    message.guild.id,
    xpPerMsg,
  ); //adds xp per message to the user, sends the data to mongoDB

  if (hasLeveledUp) {
    //if level up threshold is hit, this activates
    let user = await Levels.fetch(message.author.id, message.guild.id); //retrieves xp for user from mongoDB

    let newLevel = user.level; //check what level the user leveled up to
    let newLevelName = levelNames[newLevel]; //match the new level to the rank name

    let previousLevelName = levelNames[newLevel - 1]; // check what their level was prior to level up

    const member = message.member; //establish who leveled up
    const role = message.guild.roles.cache.find(
      (role) => role.name === newLevelName,
    ); //find the role to assign upon level up

    // remove old role if new level gives them a new role
    if (
      previousLevelName &&
      member.roles.cache.some((role) => role.name === previousLevelName)
    ) {
      const previousRole = member.guild.roles.cache.find(
        (role) => role.name === previousLevelName,
      );
      await member.roles.remove(previousRole);
    }

    await member.roles
      .add(role) //give new role and log to console
      .then(() =>
        console.log(`Added the role ${role.name} to ${member.user.tag}`),
      )
      .catch(console.error);

    message.channel.send(
      //send message
      `${message.author}, congratulations! You've leveled up to **Level ${user.level}** and have been awarded the role **${role.name}**`,
    );
  }
});

// Log the client in using the token from the config file
client.login(token);
