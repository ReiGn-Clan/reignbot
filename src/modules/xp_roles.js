const fs = require('node:fs');
const Levels = require('discord-xp');
const { EmbedBuilder } = require('discord.js');

const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8');
const levelNames = JSON.parse(levelNamesData);

async function levelUp(message) {
    let user = await Levels.fetch(message.author.id, message.guild.id);

    let newLevel = user.level;
    let newLevelName = levelNames[newLevel];

    let previousLevelName = levelNames[newLevel - 1];

    const member = message.member;
    const role = message.guild.roles.cache.find(
        (role) => role.name === newLevelName,
    );

    const fetchedMember = await member.guild.members.fetch(member.id);

    if (
        previousLevelName &&
        fetchedMember.roles.cache.map((role) => role.name == previousLevelName)
    ) {
        const previousRole = member.guild.roles.cache.find(
            (role) => role.name === previousLevelName,
        );
        await member.roles.remove(previousRole);

        if (previousLevelName === newLevelName) {
            message.channel.send(
                `${message.author}, congratulations! You've leveled up to **Level ${user.level}!**`,
            );
        }

        if (previousLevelName != newLevelName) {
            await member.roles.add(role);
            message.channel.send(
                `${message.author}, congratulations! You've leveled up to **Level ${user.level}** and have been awarded the role **${role.name}!**`,
            );
        }
    }
}

async function updateXpLeaderboard(guild) {
    const limit = 1000;
    const leaderboard = await Levels.fetchLeaderboard(guild.id, limit);

    const memberPromises = leaderboard.map(async (user, index) => {
        try {
            const member = await guild.members.fetch(user.userID);
            return `${index + 1}. ${
                member.nickname ?? member.user.username
            } - Level ${user.level} (${user.xp} XP)`;
        } catch (error) {
            console.error(`Error fetching member ${user.userID}:`, error);
            return null;
        }
    });

    const leaderboardData = (await Promise.all(memberPromises)).filter(
        (entry) => entry !== null,
    );

    const fields = [
        {
            name: 'User',
            value: leaderboardData
                .map((entry) => entry.split(' - ')[0])
                .join('\n'),
            inline: true,
        },
        {
            name: 'XP',
            value: leaderboardData
                .map((entry) => entry.split(' - ')[1])
                .join('\n'),
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

module.exports = { levelUp, updateXpLeaderboard };
