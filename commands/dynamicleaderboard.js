const { MongoClient } = require('mongodb');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const {mongoUris} = require('../prod_config.json');
const client = new MongoClient(mongoUris[1]);
const db = client.db('recruiter');

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

        // Get all member ID's and change them to fit the wanted id format
        let all_members = await interaction.guild.members.fetch();
        all_members.forEach(function (item, key) {
            if (item.user.bot) {
                all_members.delete(key);
            }
        });
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
            ])
            .toArray();

        const memberPromises = sorted_leaderboard.map(async (user, index) => {
            const member = await interaction.guild.members.fetch(
                String(user._id).substring(1),
            );
            return [
                `${index + 1}. ${member.nickname ?? member.user.username}`,
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
