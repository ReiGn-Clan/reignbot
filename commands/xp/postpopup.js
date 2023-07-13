const { SlashCommandBuilder } = require('discord.js');
const xp_roles = require('../../src/modules/xp_roles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('postpopup')
        .setDescription('Create a popup message manually')
        .addIntegerOption((option) =>
            option
                .setName('xp')
                .setDescription('How much xp the user gets')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100000),
        )
        .addIntegerOption((option) =>
            option
                .setName('uses')
                .setDescription('The amount of uses the pop up has')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(30),
        ),

    async execute(interaction) {
        const uses = interaction.options.getInteger('uses');

        const xp = interaction.options.getInteger('xp');
        await xp_roles.makeDaily(interaction.client, true, xp, uses);

        await interaction.reply('Posted pop-up xp message');
    },
};
