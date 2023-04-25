const {SlashCommandBuilder} = require('discord.js');
const Levels = require('discord-xp');

async function setXP(interaction){
    let user = interaction.options.getUser('user');
    let amount = interaction.options.getInteger('amount');

    const addXP = await Levels.setXp(user.id, interaction.guild.id, amount);
    let userTotalXP = await Levels.fetch(
        interaction.user.id,
        interaction.guild.id,
        true,
    );

    await interaction.reply(
        `Set ${user}'s XP to ${userTotalXP.xp}.`
    );
}

module.exports ={
    data: new SlashCommandBuilder()
        .setName('setXP')
        .setDescription("Set a user's xp to a specified amount.")
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to set XP for.')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription("What to set the user's XP to.")
                .setMinValue(1)
                .setRequired(true),
        ),
    execute: setXP,
};