const fs = require('node:fs');
const path = require('node:path');
const Levels = require('discord-xp');
const inv_l = require('./src/modules/invite_tracking.js');
const xp_roles = require('./src/modules/xp_roles.js');

const mongo_uri = `mongodb+srv://admin:0mJPeNCsVKfjJ80n@reignbot.bcvxwha.mongodb.net/xpDatabase`; //set uri for mongoDB
Levels.setURL(mongo_uri); //this connects to the database, then sets the URL for the database for the discord-xp library
//NOTE: You don't need to connect to the database in a command file if you need to access it, it's only needed in the main file

// Require the 'Client', 'Collection', 'Events', and 'GatewayIntentBits' objects from the 'discord.js' module
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');

// Require the 'token' property from the 'config.json' file
const { token, guildID } = require('./config.json');

// Create a new instance of the 'Client' object with the necessary intents enabled
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildPresences,
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
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true,
            });
        }
    }
});

//event for each message posted, awards xp to every user per message
client.on('messageCreate', async (message) => {
    //if the message starts with the command prefix or if the author is the bot, skip this method
    if (message.content.startsWith('/') || message.author.bot) {
        return;
    }

    // Here we establish an xpPerMsg variable, then a hasLeveledUp variable
    const xpPerMsg = 15;
    let hasLeveledUp = await Levels.appendXp(
        message.author.id,
        message.guild.id,
        xpPerMsg,
    ).catch(console.error); // add error handling for appendXp function

    if (hasLeveledUp) {
        console.log('here!');
        try {
            await xp_roles.levelUp(message);
        } catch (error) {
            console.error(error); // add error handling for levelUp function
        }
    }
});

// Run once to make sure all invites are stored
client.once(Events.ClientReady, () => {
    client.guilds.fetch(guildID).then((guild) => {
        guild.invites.fetch().then((inv) => inv_l.UpdateLinks(inv));
    });
});

// Event for when invite is created
client.on(Events.InviteCreate, async () => {
    console.log('Invite event triggered');
    client.guilds.fetch(guildID).then((guild) => {
        guild.invites.fetch().then((inv) => inv_l.UpdateLinks(inv));
    });
});

// Event for when user joins
client.on(Events.GuildMemberAdd, async (member) => {
    console.log('User joined');
    console.log(member.id);
    client.guilds.fetch(guildID).then((guild) => {
        guild.invites
            .fetch()
            .then((inv) => inv_l.UpdateLeaderboard(inv, member.id, guild));
    });
    //inv_l.UpdateLeaderboard(member.id);
});

// Event for when user leaves
client.on(Events.GuildMemberRemove, async (member) => {
    console.log('User left');
    console.log(member.id);
    client.guilds.fetch(guildID).then((guild) => {
        guild.invites
            .fetch()
            .then((inv) =>
                inv_l.UpdateLeaderboard(inv, member.id, guild, false),
            );
    });
});

// Log the client in using the token from the config file
client.login(token);
