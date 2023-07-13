const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removedynamicleaderboard')
        .setDescription('Removes a dynamic leaderboard')
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('The channel to post leaderboard')
                .setRequired(true),
        ),

    async execute(interaction) {
        let dynamicLeaderboards = JSON.parse(
            fs.readFileSync('./json/dynamic_leaderboards.json'),
        );

        const client = interaction.client;

        const name = interaction.options.getString('name');

        const channel = await client.channels.fetch(
            dynamicLeaderboards[name].channel,
        );

        const message = await channel.messages.fetch(
            dynamicLeaderboards[name].message,
        );

        message.delete().catch(console.error);

        delete dynamicLeaderboards[name];

        let json_data = JSON.stringify(dynamicLeaderboards, null, 2);

        fs.writeFileSync(
            './json/dynamic_leaderboards.json',
            json_data,
            (err) => {
                if (err) throw err;
                console.log('Links written to file');
            },
        );

        await interaction.reply('Removed Dynamic leaderboard');
    },
};
