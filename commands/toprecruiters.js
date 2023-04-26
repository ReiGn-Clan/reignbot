const { MongoClient } = require('mongodb');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/recruiter`;
const client = new MongoClient(uri);
const db = client.db('recruiter');

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

        const invite_leaderboard = await db.collection('invite_leaderboard');

        let sorted_leaderboard = await invite_leaderboard
            .aggregate([
                {
                    $sort: { score: -1 },
                },
            ])
            .toArray();

        const leaderboard_limit =
            interaction.options.getInteger('leaderboard_length');

        const all_members = await interaction.guild.members.fetch();
        const all_memberIDs = Array.from(all_members.keys());
        let unknown_members = 0;

        const memberPromises = sorted_leaderboard
            .slice(0, leaderboard_limit)
            .map(async (user, index) => {
                try {
                    if (all_memberIDs.includes(String(user._id).substring(1))) {
                        const member = await interaction.guild.members.fetch(
                            String(user._id).substring(1),
                        );
                        return `${index + 1 - unknown_members}. ${
                            member.nickname ?? member.user.username
                        } - ${user.score} - ${emote_dict[user.change]}`;
                    } else {
                        unknown_members += 1;
                    }
                } catch (error) {
                    console.error(
                        `Error fetching member ${user.userID}`,
                        error,
                    );
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
