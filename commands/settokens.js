const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
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

        await interaction.reply({
            content: `Set ${user}'s ReiGn Tokens to ${userTotalXP.xp}.`,
            ephemeral: true,
        });

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
        .setName('settokens')
        .setDescription("Set a user's ReiGn Tokens to a specified amount.")
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to set ReiGn Tokens for.')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription("What to set the user's ReiGn Tokens to.")
                .setMinValue(1)
                .setRequired(true),
        ),
    execute: setxp,
};
