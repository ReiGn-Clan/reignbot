const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');

async function giveXP(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    let hasLeveledUp = await Levels.appendXp(
        user.id,
        interaction.guild.id,
        amount,
    );
    let userTotalXP = await Levels.fetch(user.id, interaction.guild.id, true);

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

    await interaction.reply({
        content: `Added ${amount} ReiGn Tokens to ${user}. They now have ${userTotalXP.xp} ReiGn Tokens!`,
        ephemeral: true,
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givetokens')
        .setDescription('Give a user a specified amount of ReiGn Tokens.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to give ReiGn Tokens to.')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription('Amount of ReiGn Tokens to give to the user')
                .setMinValue(1)
                .setRequired(true),
        ),
    execute: giveXP,
};
