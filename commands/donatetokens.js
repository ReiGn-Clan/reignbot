const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');

async function giveXP(interaction) {
    const user = interaction.options.getUser('user');
    const tokens = interaction.options.getInteger('amount');

    if (interaction.user == user) {
        interaction.reply({
            content: 'You cannot donate to yourself!',
            ephemeral: true,
        });
        return;
    }

    // Check if the user donating has enough XP
    const init_userXP = await Levels.fetch(
        interaction.user.id,
        interaction.guild.id,
    );

    if (init_userXP.xp <= tokens) {
        interaction.reply({
            content: 'You do not have enough tokens for this!',
            ephemeral: true,
        });
        return;
    }

    // Remove the tokens from the user donating
    const hasLeveledDown = await Levels.subtractXp(
        interaction.user.id,
        interaction.guild.id,
        tokens,
    );

    if (hasLeveledDown) {
        await xp_roles.improvedLevelUp(
            interaction.guild,
            interaction.user.id,
            interaction.client,
            true,
            true,
        );
    }

    let hasLeveledUp = await Levels.appendXp(
        user.id,
        interaction.guild.id,
        tokens,
    );

    let userTotalXP = await Levels.fetch(user.id, interaction.guild.id, true);

    if (hasLeveledUp) {
        try {
            await xp_roles.improvedLevelUp(
                interaction.guild,
                user.id,
                interaction.client,
                false,
                true,
            );
        } catch (error) {
            console.error(error); // add error handling for levelUp functio
        }
    }

    await interaction.reply({
        content: `${interaction.user} donated ${tokens} ReiGn Tokens to ${user}. They now have ${userTotalXP.xp} ReiGn Tokens!`,
        ephemeral: false,
    });

    let init_userXP_after = await Levels.fetch(
        interaction.user.id,
        interaction.guild.id,
    );

    while (init_userXP_after.xp == init_userXP.xp) {
        init_userXP_after = await Levels.fetch(
            interaction.user.id,
            interaction.guild.id,
        );
    }

    if (init_userXP_after.level < init_userXP.level) {
        console.log('Deranked');
        xp_roles.improvedLevelUp(
            interaction.guild,
            interaction.user.id,
            interaction.client,
            true,
            true,
        );
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('donatetokens')
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
