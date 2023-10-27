const mongo_bongo = require('./src/utils/mongo_bongo.js');
mongo_bongo.connectToDatabase();

const fs = require('node:fs');
const path = require('node:path');
const Levels = require('./src/utils/syb_xp.js');
const inv_l = require('./src/modules/invite_tracking.js');
const xp_roles = require('./src/modules/xp_roles.js');
const faceit_integration = require('./src/modules/faceit_integration.js');
const topgg_integration = require('./src/modules/topgg_integration.js');
const timers = require('./src/utils/timers.js');
const webhookserver = require('./src/utils/webhookserver.js');
const introductions = require('./src/modules/introductions.js');
const twitchIntegration = require('./src/modules/twitch_integration.js');
const voiceReward = require('./src/modules/voice_reward.js');

const async = require('async');

// Require the 'Client', 'Collection', 'Events', and 'GatewayIntentBits' objects from the 'discord.js' module
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');

const { config_to_use } = require('./general_config.json');
const token_rates = require('./token_rates.json');
const { discordAPIBotStuff, xpDbEnvironment } = require(`./${config_to_use}`);

// For voice channel tracking
let afk_channel = null;

// Create a new instance of the 'Client' object with the necessary intents enabled
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

faceit_integration.setClient(client);
topgg_integration.setClient(client);
introductions.setClient(client);
webhookserver.startWebHookServer();
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

// Create queues
const invLeaderboardQueue = async.queue((task, callback) => {
    // Fetch the guild object
    client.guilds.fetch(discordAPIBotStuff[1].guildID).then((guild) => {
        // Fetch a list of invites
        guild.invites.fetch().then((invites) => {
            // Check if we update the leaderboard
            // Or we simply fetch invites
            if (task.fetchinv) {
                console.log('Invite in task Q');
                inv_l
                    .UpdateLinks(invites)
                    .then(() => {
                        console.log(`Fetched invites!`);
                        callback();
                    })
                    .catch((err) => {
                        console.error(`Error fetching invites: ${err}`);
                        callback(err);
                    });
            } else {
                // If we update the leaderboard, check if new member
                // has joined, so we assign roles to that person
                if (task.increase) {
                    let roles = [];
                    roles.push(
                        guild.roles.cache.find(
                            (role) => role.name === 'Neophyte',
                        ),
                    );
                    roles.push(
                        guild.roles.cache.find(
                            (role) => role.name === 'Member',
                        ),
                    );
                    roleQueue.push({ memberobject: task.member, roles: roles });
                }
                // Execute the task function with its arguments
                inv_l
                    .UpdateLeaderboard(
                        invites,
                        task.member,
                        guild,
                        client,
                        task.increase,
                    )
                    .then(() => {
                        console.log(
                            `Updated leaderboard for member ${task.id}`,
                        );
                        callback();
                    })
                    .catch((err) => {
                        console.error(
                            `Error updating leaderboard for member ${task.id}: ${err}`,
                        );
                        callback(err);
                    });
            }
        });
    });
}, 1);

const roleQueue = async.queue((task, callback) => {
    // execute the task function with its arguments
    task.memberobject
        .edit({ roles: task.roles })
        .then(() => {
            console.log(`Assigned role`);
            callback();
        })
        .catch((err) => {
            console.error(`Error assigning role, ${err}`);
            callback(err);
        });
}, 1);

const reactionQueue = async.queue((task, callback) => {
    // execute the task function with its arguments
    xp_roles
        .rewardDaily(task.reaction, task.user, client)
        .then(() => {
            console.log(`Rewarded daily`);
            callback();
        })
        .catch((err) => {
            console.error(`Error rewarding daily, ${err}`);
            callback(err);
        });
}, 1);

async function KickKids() {
    const guild = await client.guilds.fetch(discordAPIBotStuff[1].guildID);
    const role = await guild.roles.fetch('1125194932819341322');
    const members = await role.members;

    members.forEach((value) => {
        console.log(value.user.username);
        value.kick('Underage!');
    });
}

// When the client is ready, log a message to the console and connect to mongoDB
client.once(Events.ClientReady, async () => {
    console.log('Ready!');
    const guild = client.guilds.cache.get(discordAPIBotStuff[1].guildID);
    afk_channel = guild.afkChannelId;

    Levels.set_collection(xpDbEnvironment, 'levels'); //this connects to the database, then sets the URL for the database for the discord-xp library

    xp_roles.makeDaily(client);

    //voiceReward.bot_boot(guild);

    setInterval(() => {
        xp_roles.updateXpLeaderboard(discordAPIBotStuff[1].guildID, client);
    }, 60000);

    setInterval(() => {
        voiceReward.faster_reward(guild, client, afk_channel);
    }, 60000);

    setInterval(() => {
        twitchIntegration.isLive(client);
    }, 30000);

    setInterval(() => {
        xp_roles.makeDaily(client);
    }, 6000000);

    setInterval(() => {
        KickKids();
    }, 500);

    console.log('Invite event triggered');
    invLeaderboardQueue.push({
        fetchinv: true,
    });

    await timers.restartTimers(guild, client);

    //client.user.setAvatar('./assets/logo_v1_dev.png');
    //client.user.setUsername('ReignBotDEV');
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
    if (
        message.embeds.length &&
        message.author.username == 'DISBOARD' &&
        message.embeds[0].description.indexOf('Bump done') > -1
    ) {
        timers.bumpTimer(Date.now() + 7200000, message.channel);

        await xp_roles.rewardBump(message, client);
    }

    //if the message starts with the command prefix or if the author is the bot, skip this method
    if (message.content.startsWith('/') || message.author.bot) {
        return;
    }

    // Here we establish an xpPerMsg variable, then a hasLeveledUp variable
    let hasLeveledUp = await Levels.appendXp(
        message.author.id,
        message.guild.id,
        token_rates.perMessage,
    ).catch(console.error); // add error handling for appendXp function

    if (hasLeveledUp) {
        try {
            await xp_roles.improvedLevelUpMessage(message, client);
        } catch (error) {
            console.error(error); // add error handling for levelUp functio
        }
    }
    let introductionsChannelID = '1105944524162859171';

    if (message.channel.id === introductionsChannelID && !message.author.bot) {
        await message.delete();
    }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const { guild } = newMember;
    if (!guild) return;

    let boosterRoleID = '1089665914129105066';
    const wasBoosting = oldMember.roles.cache.has(boosterRoleID);
    const isBoosting = newMember.roles.cache.has(boosterRoleID);

    if (!wasBoosting && isBoosting) {
        const user = newMember.user;
        await xp_roles.rewardBoost(discordAPIBotStuff[1].guildID, user, client);
    }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const { guild } = newMember;
    if (!guild) return;

    let boosterRoleID = '1120327700398231562';
    const wasBoosting = oldMember.roles.cache.has(boosterRoleID);
    const isBoosting = newMember.roles.cache.has(boosterRoleID);

    if (!wasBoosting && isBoosting) {
        const user = newMember.user;
        await xp_roles.rewardSubscriber(
            discordAPIBotStuff[1].guildID,
            user,
            client,
        );
    }
});

// Event for when user joins
client.on(Events.GuildMemberAdd, async (member) => {
    console.log('User joined');
    console.log(member.id);

    invLeaderboardQueue.push({
        id: member.id,
        member: member,
        increase: true,
        fetchinv: false,
    });
    await Levels.set_initial_rank(member.id, discordAPIBotStuff[1].guildID);
});

// Event for when user leaves
client.on(Events.GuildMemberRemove, async (member) => {
    console.log('User left');
    console.log(member.id);

    invLeaderboardQueue.push({
        id: member.id,
        member: member,
        increase: false,
        fetchinv: false,
    });
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    console.log('User Reacted');
    reactionQueue.push({
        reaction: reaction,
        user: user,
    });
});

// Event for when invite is created
client.on(Events.InviteCreate, async () => {
    console.log('Invite event triggered');
    invLeaderboardQueue.push({
        fetchinv: true,
    });
});

//stop bot from joining other servers
client.on(Events.GuildCreate, async (guild) => {
    if (guild.id != discordAPIBotStuff[1].guildID) {
        guild
            .leave()
            .then((guild) =>
                console.log(`Left guild ${guild.name} after being invited`),
            );
    } else {
        console.log('Join guild event fired with reign guild id');
        return;
    }
});

// Log the client in using the token from the config file
client.login(discordAPIBotStuff[0].token);
