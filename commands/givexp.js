const { SlashCommandBuilder } = require('discord.js');
const Levels = require('discord-xp');

async function giveXP(interaction) {
    let user = interaction.options.getUser('user');
    let amount = interaction.options.getInteger('amount');

    const addXP = await Levels.appendXp(user.id, interaction.guild.id, amount);
    let userTotalXP = await Levels.fetch(
        interaction.user.id,
        interaction.guild.id,
        true,
    );

    await interaction.reply(
        `Added ${amount}XP to ${user}. They now have ${userTotalXP.xp} XP!`,
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givexp')
        .setDescription('Give a user a specified amount of XP.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to give XP to.')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription('Amount of XP to give to the user')
                .setMinValue(1)
                .setRequired(true),
        ),
    execute: giveXP,
};
