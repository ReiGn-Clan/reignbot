const fs = require('node:fs');
const Levels = require('discord-xp');
const { EmbedBuilder } = require('discord.js');

const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8');
const levelRanges = JSON.parse(levelNamesData).ranges;

const { MongoClient } = require('mongodb');

const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/xpDatabase`;
const client = new MongoClient(uri);
const db = client.db('xpDatabase');

async function improvedLevelUpMessage(message) {
    // What role should the user
    let user = await Levels.fetch(message.author.id, message.guild.id);
    const member = await message.guild.members.fetch(message.author.id);

    let newLevelRange = levelRanges.find(
        (range) => range.start <= user.level && range.end >= user.level,
    );
    let newLevelName = newLevelRange ? newLevelRange.value : null;

    // Find what level the user currently has
    let current_roles = member._roles;
    let role_array = [];
    // Check if it has one of the roles
    for (let i in levelRanges) {
        role_array.push(levelRanges[i].value);
    }

    // Loop over current roles
    for (let i in current_roles) {
        let name = (await message.guild.roles.fetch(current_roles[i])).name;

        if (role_array.includes(name)) {
            console.log('Found', name);
            if (name === newLevelName) {
                // Nothing has to be done
                console.log('No Action needed');
                message.channel.send(
                    `${message.author}, congratulations! You've leveled up to **Level ${user.level}!**`,
                );
                return;
            } else {
                console.log('Removing old role and adding new');
                const role = await message.guild.roles.cache.find(
                    (role) => role.name === newLevelName,
                );
                const previousRole = await member.guild.roles.cache.find(
                    (role) => role.name === name,
                );

                await member.roles.remove(previousRole);
                await member.roles.add(role);

                await message.channel.send(
                    `${message.author}, congratulations! You've leveled up to **Level ${user.level}** and have been awarded the role **${role.name}!**`,
                );

                return;
            }
        }
    }
    // if we come to this it means that the user did not have a rank role, which should not happen
    // but in case
    console.log('No role found wtf, adding it');
    const role = await message.guild.roles.cache.find(
        (role) => role.name === newLevelName,
    );
    await member.roles.add(role);

    await message.channel.send(
        `${message.author}, congratulations! You've leveled up to **Level ${user.level}** and have been awarded the role **${role.name}!**`,
    );
}

async function improvedLevelUp(guild, userID) {
    // What role should the user
    let user = await Levels.fetch(userID, guild.id);
    const member = await guild.members.fetch(userID);

    let newLevelRange = levelRanges.find(
        (range) => range.start <= user.level && range.end >= user.level,
    );
    let newLevelName = newLevelRange ? newLevelRange.value : null;

    // Find what level the user currently has
    let current_roles = member._roles;
    let role_array = [];
    // Check if it has one of the roles
    for (let i in levelRanges) {
        role_array.push(levelRanges[i].value);
    }

    console.log(newLevelName);
    // Loop over current roles
    for (let i in current_roles) {
        let name = (await guild.roles.fetch(current_roles[i])).name;

        if (role_array.includes(name)) {
            console.log('Found', name);
            if (name === newLevelName) {
                // Nothing has to be done
                console.log('No Action needed');
                return;
            } else {
                console.log('Removing old role and adding new');
                const role = await guild.roles.cache.find(
                    (role) => role.name === newLevelName,
                );

                const previousRole = await member.guild.roles.cache.find(
                    (role) => role.name === name,
                );

                await member.roles.remove(previousRole);
                await member.roles.add(role);

                return;
            }
        }
    }
    // if we come to this it means that the user did not have a rank role, which should not happen
    // but in case
    console.log('No role found wtf, adding it');
    const role = await guild.roles.cache.find(
        (role) => role.name === newLevelName,
    );
    await member.roles.add(role);
}

async function updateXpLeaderboard(guild) {
    const limit = 10000;
    const all_members = await guild.members.fetch();
    const all_memberIDs = Array.from(all_members.keys());

    const xp_leaderboard = await db.collection('levels');

    const sorted_leaderboard = await xp_leaderboard
        .aggregate([
            {
                $match: {
                    userID: { $in: all_memberIDs },
                },
            },
            {
                $sort: { xp: -1 },
            },
            {
                $limit: limit,
            },
        ])
        .toArray();

    const memberPromises = sorted_leaderboard.map(async (user, index) => {
        const member = await guild.members.fetch(user.userID);
        return [
            `${index + 1}. ${member.nickname ?? member.user.username}`,
            `Level ${user.level} (${user.xp} XP)`,
        ];
    });

    const leaderboardData = (await Promise.all(memberPromises)).filter(
        (entry) => entry !== undefined || null,
    );

    const fields = [
        {
            name: 'User',
            value: leaderboardData.map((entry) => entry[0]).join('\n'),
            inline: true,
        },
        {
            name: 'XP',
            value: leaderboardData.map((entry) => entry[1]).join('\n'),
            inline: true,
        },
    ];

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Top Members')
        .setDescription('Here are the top members by XP in this server:')
        .addFields(fields);

    const channel = await guild.channels.fetch('1095411283882426488');
    const message = await channel.messages.fetch('1098278074254110740');

    message
        .edit({ embeds: [embed] })
        .then(console.log('Updated XP leaderboard'))
        .catch(console.error);
}

module.exports = {
    updateXpLeaderboard,
    improvedLevelUp,
    improvedLevelUpMessage,
};
