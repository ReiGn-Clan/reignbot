const { SlashCommandBuilder } = require('discord.js');

async function giveXP(interaction) {
    await interaction.reply({
        content: 'Snap already happened!',
        ephemeral: true,
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanossnap')
        .setDescription('Set every user to Neophyte'),
    execute: giveXP,
};
