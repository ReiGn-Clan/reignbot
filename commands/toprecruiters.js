const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toprecruiters')
        .setDescription('Check the top recruiters on the leaderboard')
        .addIntegerOption((option) =>
            option
                .setName('leaderboard_length')
                .setDescription('Length of the leaderboard')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(30),
        ),

    async execute(interaction) {
        const emote_dict = {
            SAME: '⛔',
            UP: '⬆️',
            DOWN: '⬇️',
            NEW: '🆕',
        };

        const invite_leaderboard = JSON.parse(
            fs.readFileSync('./json/invite_leaderboard.json'),
        );

        if (Object.keys(invite_leaderboard).length === 0) {
            console.log('No entries on leaderboard yet');
            await interaction.reply('No entries on the leaderboard yet');
            return;
        }

        const invite_leaderboard_arr = Object.keys(invite_leaderboard).map(
            (key) => [
                key.substring(1),
                invite_leaderboard[key].score,
                invite_leaderboard[key].change,
            ],
        );

        const leaderboard_limit =
            interaction.options.getInteger('leaderboard_length');

        const all_members = await interaction.guild.members.fetch();
        const all_memberIDs = Array.from(all_members.keys());
        let unknown_members = 0;

        const memberPromises = invite_leaderboard_arr
            .slice(0, leaderboard_limit)
            .map(async (user, index) => {
                try {
                    if (all_memberIDs.includes(String(user[0]))) {
                        const member = await interaction.guild.members.fetch(
                            String(user[0]),
                        );
                        return `${index + 1 - unknown_members}. ${
                            member.nickname ?? member.user.username
                        } - ${user[1]} - ${emote_dict[user[2]]}`;
                    } else {
                        unknown_members += 1;
                    }
                } catch (error) {
                    console.error(`Error fetching member ${user}`, error);
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
                name: 'Recruited',
                value: leaderboardData
                    .map((entry) => entry.split(' - ')[1])
                    .join('\n'),
                inline: true,
            },
            {
                name: 'Change',
                value: leaderboardData
                    .map((entry) => entry.split(' - ')[2])
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
