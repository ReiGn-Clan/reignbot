const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const Levels = require('discord-xp');
const xp_roles = require('../src/modules/xp_roles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Create a coinflip')

        .addIntegerOption((option) =>
            option
                .setName('tokens')
                .setDescription('How many do you want to bet?')
                .setRequired(true),
        ),

    async execute(interaction) {
        const tokens = interaction.options.getInteger('tokens');

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

        const button_option_heads = new ButtonBuilder()
            .setCustomId('heads')
            .setLabel('Heads')
            .setStyle(ButtonStyle.Success);

        const button_option_tails = new ButtonBuilder()
            .setCustomId('tails')
            .setLabel('Tails')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(
            button_option_heads,
            button_option_tails,
        );

        // Let the user know they created a bet
        await interaction.reply({
            content: 'Started a coinflip!',
            ephemeral: true,
        });

        // Remove the tokens from the users account
        await Levels.subtractXp(
            interaction.user.id,
            interaction.guild.id,
            tokens,
        );

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
            );
        }

        // Send the bet to the channel
        let bet_message = null;

        interaction.channel
            .send({
                content: `${
                    interaction.user
                } created a coinflip! You are betting for ${tokens} ReiGn Tokens! \nThe winner will take home **${(
                    tokens *
                    2 *
                    0.9
                ).toFixed(0)}** ReiGn Tokens \nYou have 60 seconds to respond!`,
                components: [row],
            })
            .then(async (sent) => {
                bet_message = sent;
            });

        // Create collector for button clicks
        const collector = interaction.channel.createMessageComponentCollector({
            time: 60000,
        });

        let coinflip_ended = false;

        collector.on('collect', async (collected) => {
            if (collected.user.id !== interaction.user.id) {
                const userXP = await Levels.fetch(
                    collected.user.id,
                    interaction.guild.id,
                );

                if (userXP.xp >= tokens) {
                    await row.components.forEach((button) =>
                        button.setDisabled(true),
                    );

                    await bet_message
                        .edit({
                            content: `${
                                interaction.user
                            } created a coinflip! You are betting for ${tokens} ReiGn Tokens! \nThe winner will take home **${(
                                tokens *
                                2 *
                                0.9
                            ).toFixed(0)}** ReiGn Tokens \n\n${
                                collected.user
                            } has chosen ${collected.customId}`,
                            components: [row],
                        })
                        .then(async (sent) => {
                            bet_message = sent;
                        });

                    await Levels.subtractXp(
                        collected.user.id,
                        interaction.guild.id,
                        tokens,
                    );

                    let userXP_after = await Levels.fetch(
                        collected.user.id,
                        interaction.guild.id,
                    );

                    while (userXP_after.xp == userXP.xp) {
                        userXP_after = await Levels.fetch(
                            collected.user.id,
                            interaction.guild.id,
                        );
                    }

                    if (userXP_after.level < userXP.level) {
                        console.log('Deranked');
                        xp_roles.improvedLevelUp(
                            interaction.guild,
                            collected.user.id,
                            interaction.client,
                            true,
                        );
                    }

                    await collected.reply({
                        content: `You have chosen the option ${collected.customId}, tossing the coin!`,
                        files: ['./assets/coinflip.gif'],
                        ephemeral: true,
                    });

                    const randomValue = Math.random();

                    let winning_side = null;

                    if (randomValue < 0.5) {
                        winning_side = 'heads';
                    } else {
                        winning_side = 'tails';
                    }

                    let winner = null;

                    if (collected.customId === winning_side) {
                        winner = collected.user.id;
                    } else {
                        winner = interaction.user.id;
                    }

                    const member = await interaction.guild.members.fetch(
                        winner,
                    );

                    interaction.channel.send({
                        content: `The coin landed on ${winning_side}! ${
                            member.user
                        } has won ${(tokens * 2 * 0.9).toFixed(
                            0,
                        )} ReiGn Tokens`,
                        files: ['./assets/' + winning_side + '.png'],
                    });

                    let hasLeveledUp = await Levels.appendXp(
                        winner,
                        interaction.guild.id,
                        tokens * 2 * 0.9,
                    );

                    if (hasLeveledUp) {
                        try {
                            await xp_roles.improvedLevelUp(
                                interaction.guild,
                                winner,
                                interaction.client,
                            );
                        } catch (error) {
                            console.error(error); // add error handling for levelUp functio
                        }
                    }
                    coinflip_ended = true;
                    collector.stop();
                } else {
                    collected.reply({
                        content: `You do not have enough tokens for this!`,
                        ephemeral: true,
                    });
                }
            } else {
                collected.reply({
                    content: 'You cant coinflip against yourself!',
                    ephemeral: true,
                });
            }
        });

        collector.on('end', async () => {
            // Remove the buttons after the interaction ends

            if (!coinflip_ended) {
                row.components.forEach((button) => button.setDisabled(true));

                bet_message
                    .edit({
                        content: `Time ran out, coinflip cancelled!`,
                        components: [row],
                    })
                    .then(async (sent) => {
                        bet_message = sent;
                    });

                let hasLeveledUp = await Levels.appendXp(
                    interaction.user.id,
                    interaction.guild.id,
                    tokens,
                );

                if (hasLeveledUp) {
                    try {
                        await xp_roles.improvedLevelUp(
                            interaction.guild,
                            interaction.user.id,
                            interaction.client,
                        );
                    } catch (error) {
                        console.error(error); // add error handling for levelUp functio
                    }
                }
            }
        });
    },
};
