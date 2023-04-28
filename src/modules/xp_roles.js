const fs = require('node:fs');
const Levels = require('discord-xp');
const { EmbedBuilder } = require('discord.js');

const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8');
const levelRanges = JSON.parse(levelNamesData).ranges;

const { MongoClient } = require('mongodb');

const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/xpDatabase`;
const client = new MongoClient(uri);
const db = client.db('xpDatabase');

async function levelUp(message) {
    let user = await Levels.fetch(message.author.id, message.guild.id);

    let newLevelRange = levelRanges.find(
        (range) => range.start <= user.level && range.end >= user.level,
    );
    let newLevelName = newLevelRange ? newLevelRange.value : null;

    let previousLevelRange = levelRanges.find(
        (range) => range.start <= user.level - 1 && range.end >= user.level - 1,
    );
    let previousLevelName = previousLevelRange
        ? previousLevelRange.value
        : null;

    const member = message.member;
    const role = message.guild.roles.cache.find(
        (role) => role.name === newLevelName,
    );

    const fetchedMember = await member.guild.members.fetch(member.id);

    if (
        previousLevelName &&
        fetchedMember.roles.cache.map((role) => role.name === previousLevelName)
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
        return `${index + 1}. ${
            member.nickname ?? member.user.username
        } - Level ${user.level} (${user.xp} XP)`;
    });

    const leaderboardData = (await Promise.all(memberPromises)).filter(
        (entry) => entry !== undefined || null,
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
