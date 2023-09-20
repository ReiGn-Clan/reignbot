const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { xpDbEnvironment } = require(`../${config_to_use}`);
const db = mongo_bongo.getDbInstance(xpDbEnvironment);

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
                $sort: { rankValue: -1, xp: -1 },
            },
            {
                $limit: limit,
            },
        ])
        .toArray();

    const memberPromises = sorted_leaderboard.map(async (user, index) => {
        const member = await interaction.guild.members.fetch(user.userID);
        if (typeof user.rank == 'undefined') {
            user.rank = 'Neophyte';
        }
        let tokens = user.xp;
        if (tokens > 100000000000) {
            tokens = '' + tokens;
            tokens = tokens.substring(0, tokens.length - 9) + 'B';
        } else if (tokens > 100000000) {
            tokens = '' + tokens;
            tokens = tokens.substring(0, tokens.length - 6) + 'M';
        }
        return [
            `${index + 1}:  ${member.nickname ?? member.user.username}`,
            `${user.rank}`,
            `${tokens} RT `,
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
            name: 'Rank',
            value: leaderboardData.map((entry) => entry[1]).join('\n'),
            inline: true,
        },
        {
            name: 'RT',
            value: leaderboardData.map((entry) => entry[2]).join('\n'),
            inline: true,
        },
    ];

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Top Members')
        .setDescription(
            `Here are the top ${limit} users in this server by ReiGn Tokens:`,
        )
        .addFields(fields);

    await interaction.channel.send({ embeds: [embed], ephemeral: true });
    await interaction.reply({
        content: 'The top ' + String(limit) + ' users by ReiGn Tokens',
        ephemeral: true,
    });
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
