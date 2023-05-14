const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');

const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/xpDatabase`;
const client = new MongoClient(uri);
const db = client.db('xpDatabase');

async function checkLeaderboard(interaction) {
    const limit = interaction.options.getInteger('leaderboard_length');

    let all_members = await interaction.guild.members.fetch();

    all_members.forEach(function (item, key) {
        if (item.user.bot) {
            all_members.delete(key);
        }
    });
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
        const member = await interaction.guild.members.fetch(user.userID);
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
        .setTitle('XP Leaderboard')
        .setDescription('Here are the top 10 users in this server by XP:')
        .addFields(fields);

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply('The top ' + String(limit) + ' users by xp');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkleaderboard')
        .setDescription('Check the top users on the leaderboard')
        .addIntegerOption((option) =>
            option
                .setName('leaderboard_length')
                .setDescription('Length of the leaderboard')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10),
        ),
    execute: checkLeaderboard,
};
