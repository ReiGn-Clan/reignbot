const { SlashCommandBuilder } = require('discord.js');
const Levels = require('discord-xp');
const xp_roles = require('../src/modules/xp_roles.js');

async function setxp(interaction) {
    let user = interaction.options.getUser('user');
    let amount = interaction.options.getInteger('amount');

    let hasLeveledUp = await Levels.setXp(
        user.id,
        interaction.guild.id,
        amount,
    );

    setTimeout(async function () {
        let userTotalXP = await Levels.fetch(
            user.id,
            interaction.guild.id,
            true,
        );

        await interaction.reply(`Set ${user}'s XP to ${userTotalXP.xp}.`);

        if (hasLeveledUp) {
            try {
                await xp_roles.improvedLevelUp(
                    interaction.guild,
                    user.id,
                    interaction.client,
                );
            } catch (error) {
                console.error(error); // add error handling for levelUp functio
            }
        }
    }, 300);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setxp')
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
    execute: setxp,
};
