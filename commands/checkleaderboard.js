const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Levels = require('discord-xp');

async function checkLeaderboard(interaction) {
    const limit = interaction.options.getInteger('leaderboard_length');
    const leaderboard = await Levels.fetchLeaderboard(
        interaction.guild.id,
        limit,
    );

    const all_members = await interaction.guild.members.fetch();
    const all_memberIDs = Array.from(all_members.keys());
    let unknown_members = 0;

    const memberPromises = leaderboard.map(async (user, index) => {
        try {
            if (all_memberIDs.includes(String(user.userID))) {
                const member = await interaction.guild.members.fetch(
                    user.userID,
                );
                return `${index + 1 - unknown_members}. ${
                    member.nickname ?? member.user.username
                } - Level ${user.level} (${user.xp} XP)`;
            } else {
                unknown_members += 1;
            }
        } catch (error) {
            console.error(`Error fetching member ${user.userID}`, error);
            return null;
        }
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
                .setMaxValue(30),
        ),
    execute: checkLeaderboard,
};
