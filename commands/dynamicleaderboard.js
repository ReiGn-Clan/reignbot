const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createleaderboard')
        .setDescription('Creates a dynamic leaderboard')
        .addStringOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to post leaderboard')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of leaderboard')
                .setRequired(true),
        ),

    async execute(interaction) {
        const client = interaction.client;
        const name = interaction.options.getString('name');
        const channelID = interaction.options.getString('channel');

        const channel = await client.channels.fetch(channelID);

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
                Number(key.substring(1)),
                invite_leaderboard[key].score,
                invite_leaderboard[key].change,
            ],
        );

        const memberPromises = invite_leaderboard_arr.map(
            async (user, index) => {
                const member = await interaction.guild.members.fetch(
                    String(user[0]),
                );
                return `${index + 1}. ${
                    member.nickname ?? member.user.username
                } - ${user[1]} - ${emote_dict[user[2]]}`;
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
            .setTitle(name)
            .setDescription('The top recruiters in the server:')
            .addFields(fields);

        channel.send({ embeds: [embed] }).then((sent) => {
            let id_ = sent.id;
            let dynamicLeaderboards = JSON.parse(
                fs.readFileSync('./json/dynamic_leaderboards.json'),
            );
            dynamicLeaderboards[name] = {
                message: id_,
                channel: channelID,
            };

            let json_data = JSON.stringify(dynamicLeaderboards, null, 2);

            fs.writeFileSync(
                './json/dynamic_leaderboards.json',
                json_data,
                (err) => {
                    if (err) throw err;
                    console.log('Links written to file');
                },
            );
        });

        await interaction.reply('Created Dynamic leaderboard');
    },
};
