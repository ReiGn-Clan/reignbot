const { REST, Routes } = require('discord.js'); // Import the REST and Routes classes from the discord.js library
const { discordAPIBotStuff } = require('./prod_config.json'); // Import the client ID, guild ID, and token from a separate config file
const fs = require('node:fs'); // Import the fs module to read command files from the file system
const path = require('node:path'); // Import the path module to resolve file paths

// Create an empty array to store the command data
const commands = [];

// Resolve the path to the commands directory
const commandsPath = path.join(__dirname, 'commands');
// Read the contents of the directory and filter for files that end with ".js"
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
    // Loop through each command file
    const command = require(`./commands/${file}`); // Load the command from the file
    commands.push(command.data.toJSON()); // Add the command data to the array
}

// Create a new REST instance and set the token
const rest = new REST({ version: 10 }).setToken(discordAPIBotStuff[0].token);

// Define an asynchronous function that will refresh the application commands
(async () => {
    try {
        // Log a message indicating the number of commands being refreshed
        console.log(
            `Started refreshing ${commands.length} application (/) commands.`,
        );

        // Use the REST API to update the guild's commands with the data in the commands array
        const data = await rest.put(
            Routes.applicationGuildCommands(
                discordAPIBotStuff[2].clientID,
                discordAPIBotStuff[1].guildID,
            ),
            { body: commands },
        );

        // Log a message indicating the number of commands that were successfully reloaded
        console.log(
            `Successfully reloaded ${data.length} application (/) commands.`,
        );
    } catch (error) {
        console.error(error); // If an error occurs, log the error to the console
    }
})(); // Immediately invoke the async function to refresh the commands when the script is run
