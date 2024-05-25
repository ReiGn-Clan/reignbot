const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');

async function subtractXP(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    let hasLeveledUp = await Levels.subtractXp(
        user.id,
        interaction.guild.id,
        amount,
    );
    let userTotalXP = await Levels.fetch(user.id, interaction.guild.id);

    if (hasLeveledUp) {
        try {
            await xp_roles.improvedLevelUp(
                interaction.guild,
                user.id,
                interaction.client,
                true,
            );
        } catch (error) {
            console.error(error); // add error handling for levelUp functio
        }
    }

    await interaction.reply({
        content: `Removed ${amount} ReiGn Tokens from ${user}. They now have ${userTotalXP.xp} ReiGn Tokens!`,
        ephemeral: true,
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('subtracttokens')
        .setDescription('Subtract an amount of tokens from a user.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to subtract ReiGn Tokens from.')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription(
                    'Amount of ReiGn Tokens to subtract from the user',
                )
                .setMinValue(1)
                .setRequired(true),
        ),
    execute: subtractXP,
};
