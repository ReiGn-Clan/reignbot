const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toprecruiters')
        .setDescription('Check the top recruiters on the leaderboard'),

    async execute(interaction) {
        const invite_leaderboard = JSON.parse(
            fs.readFileSync('invite_leaderboard.json'),
        );

        if (Object.keys(invite_leaderboard).length === 0) {
            console.log('No entries on leaderboard yet');
            await interaction.reply('No entries on the leaderboard yet');
            return;
        }

        const invite_leaderboard_arr = Object.keys(invite_leaderboard).map(
            (key) => [Number(key), invite_leaderboard[key]],
        );

        const memberPromises = invite_leaderboard_arr.map(
            async (user, index) => {
                const member = await interaction.guild.members.fetch(
                    String(user[0]),
                );
                return `${index + 1}. ${
                    member.nickname ?? member.user.username
                } - ${user[1]}`;
            },
        );

        const leaderboardData = await Promise.all(memberPromises);

        const fields = [
            {
                name: 'User',
                value: leaderboardData
                    .map((entry) => entry.split(' - ')[0])
                    .join('\n'),
                inline: true,
            },
            {
                name: 'Recruited',
                value: leaderboardData
                    .map((entry) => entry.split(' - ')[1])
                    .join('\n'),
                inline: true,
            },
        ];

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Invite Leaderboard')
            .setDescription('Here are the top recruiters in this server:')
            .addFields(fields);

        await interaction.reply({ embeds: [embed] });
    },
};
