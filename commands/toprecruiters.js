const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { recruiterDbEnvironment } = require('../dev_config.json');
const db = mongo_bongo.getDbInstance(recruiterDbEnvironment);

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

        const leaderboard_limit =
            interaction.options.getInteger('leaderboard_length');
        const all_members = await interaction.guild.members.fetch();
        const all_memberIDs = Array.from(all_members.keys());
        let modified_memberIDs = all_memberIDs.map((id) => 'u' + id);
        const invite_leaderboard = await db.collection('invite_leaderboard');

        let sorted_leaderboard = await invite_leaderboard
            .aggregate([
                {
                    $match: {
                        _id: { $in: modified_memberIDs },
                    },
                },
                {
                    $sort: { score: -1 },
                },
                {
                    $limit: leaderboard_limit,
                },
            ])
            .toArray();

        const memberPromises = sorted_leaderboard.map(async (user, index) => {
            const member = await interaction.guild.members.fetch(
                String(user._id).substring(1),
            );
            return [
                `${index + 1}:  ${member.nickname ?? member.user.username}`,
                `${user.score}`,
                `${emote_dict[user.change]}`,
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
                name: 'Recruited',
                value: leaderboardData.map((entry) => entry[1]).join('\n'),
                inline: true,
            },
            {
                name: 'Change',
                value: leaderboardData.map((entry) => entry[2]).join('\n'),
                inline: true,
            },
        ];

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Invite Leaderboard')
            .setDescription('Here are the top recruiters in this server:')
            .addFields(fields);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
