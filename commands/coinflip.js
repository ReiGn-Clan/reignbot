const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { gamblingDbEnvironment } = require('../prod_config.json');
const db = mongo_bongo.getDbInstance(gamblingDbEnvironment);
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Create a coinflip')

        .addIntegerOption((option) =>
            option
                .setName('tokens')
                .setDescription('How many do you want to bet?')
                .setRequired(true)
                .setMinValue(1),
        )

        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('A user the challenge (not required)')
                .setRequired(false),
        ),

    async execute(interaction) {
        const tokens = interaction.options.getInteger('tokens');
        const user_challenge = interaction.options.getUser('user');
        const gambles = db.collection('gambles');

        const init_userXP = await Levels.fetch(
            interaction.user.id,
            interaction.guild.id,
        );

        if (init_userXP.xp <= tokens) {
            await interaction.reply({
                content: 'You do not have enough tokens for this!',
                ephemeral: true,
            });
            return;
        }

        const button_option_heads = new ButtonBuilder()
            .setCustomId('heads')
            .setLabel('Heads')
            .setStyle(ButtonStyle.Primary);

        const button_option_tails = new ButtonBuilder()
            .setCustomId('tails')
            .setLabel('Tails')
            .setStyle(ButtonStyle.Success);

        const button_option_cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(
            button_option_heads,
            button_option_tails,
            button_option_cancel,
        );

        // Let the user know they created a bet
        await interaction.reply({
            content: 'Started a coinflip!',
            ephemeral: true,
        });

        // Remove the tokens from the users account
        const initHasLeveledDown = await Levels.subtractXp(
            interaction.user.id,
            interaction.guild.id,
            tokens,
        );

        // Send the bet to the channel
        let bet_message = null;

        if (user_challenge == null) {
            await interaction.channel
                .send({
                    content: `${
                        interaction.user
                    } created a coinflip! You are betting for ${tokens} ReiGn Tokens! \nThe winner will take home **${(
                        tokens *
                        2 *
                        0.9
                    ).toFixed(
                        0,
                    )}** ReiGn Tokens \nYou have 60 seconds to respond!`,
                    components: [row],
                })
                .then(async (sent) => {
                    bet_message = sent;
                });
        } else {
            await interaction.channel
                .send({
                    content: `${
                        interaction.user
                    } created a coinflip! You are betting for ${tokens} ReiGn Tokens! \nThe winner will take home **${(
                        tokens *
                        2 *
                        0.9
                    ).toFixed(
                        0,
                    )}** ReiGn Tokens \n${user_challenge} has 60 seconds to respond!`,
                    components: [row],
                })
                .then(async (sent) => {
                    bet_message = sent;
                });
        }

        // Create collector for button clicks

        let collector = null;
        if (user_challenge == null) {
            collector = interaction.channel.createMessageComponentCollector({
                time: 60000,
            });
        } else {
            const collectorFilter = async (i) => {
                if (
                    i.user.id === user_challenge.id ||
                    i.user.id === interaction.user.id
                ) {
                    return true;
                } else {
                    await i.reply({
                        content: `Only the challenged person is allowed to respond!`,
                        ephemeral: true,
                    });
                }
            };

            collector = interaction.channel.createMessageComponentCollector({
                filter: collectorFilter,
                time: 60000,
            });
        }

        let coinflip_ended = false;

        let allowed = true;

        collector.on('collect', async (collected) => {
            if (collected.message === bet_message) {
                if (allowed) {
                    allowed = false;
                    if (collected.customId !== 'cancel') {
                        if (collected.user.id !== interaction.user.id) {
                            const userXP = await Levels.fetch(
                                collected.user.id,
                                interaction.guild.id,
                            );

                            if (userXP.xp >= tokens) {
                                // Disable buttons
                                row.components.forEach((button) =>
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

                                //  Subtract tokens
                                const hasLeveledDown = await Levels.subtractXp(
                                    collected.user.id,
                                    interaction.guild.id,
                                    tokens,
                                );

                                // Let people know they bet
                                await collected.reply({
                                    content: `You have chosen the option ${collected.customId}, tossing the coin!`,
                                    files: ['./assets/coinflip.gif'],
                                    ephemeral: true,
                                });

                                // Calculate odds
                                const randomValue = Math.random();

                                let winning_side = null;

                                if (randomValue < 0.5) {
                                    winning_side = 'heads';
                                } else {
                                    winning_side = 'tails';
                                }

                                // Determine winner
                                let winner = null;
                                let loser = null;

                                if (collected.customId === winning_side) {
                                    winner = collected.user.id;
                                    loser = interaction.user.id;
                                } else {
                                    winner = interaction.user.id;
                                    loser = collected.user.id;
                                }

                                // Post the winner
                                const member =
                                    await interaction.guild.members.fetch(
                                        winner,
                                    );

                                await interaction.channel.send({
                                    content: `The coin landed on ${winning_side}! ${
                                        member.user
                                    } has won ${(tokens * 2 * 0.9).toFixed(
                                        0,
                                    )} ReiGn Tokens`,
                                    files: [
                                        './assets/' + winning_side + '.png',
                                    ],
                                });

                                // Reward the winner
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
                                            false,
                                            true,
                                        );
                                    } catch (error) {
                                        console.error(error); // add error handling for levelUp functio
                                    }
                                }

                                // Let the loser know they deranked if they did
                                if (loser == interaction.user.id) {
                                    if (initHasLeveledDown) {
                                        console.log('Deranked');
                                        xp_roles.improvedLevelUp(
                                            interaction.guild,
                                            interaction.user.id,
                                            interaction.client,
                                            true,
                                            true,
                                        );
                                    }
                                } else {
                                    if (hasLeveledDown) {
                                        console.log('Deranked');
                                        xp_roles.improvedLevelUp(
                                            interaction.guild,
                                            collected.user.id,
                                            interaction.client,
                                            true,
                                            true,
                                        );
                                    }
                                }

                                const doc = {
                                    game: 'coinflip',
                                    starter: interaction.user.id,
                                    result: winning_side,
                                    winner: winner,
                                    loser: loser,
                                    stake: tokens,
                                    payout: tokens * 2 * 0.9,
                                };

                                await gambles.insertOne(doc);

                                coinflip_ended = true;
                                collector.stop();
                            } else {
                                allowed = true;

                                await collected.reply({
                                    content: `You do not have enough tokens for this!`,
                                    ephemeral: true,
                                });
                            }
                        } else {
                            allowed = true;

                            await collected.reply({
                                content: 'You cant coinflip against yourself!',
                                ephemeral: true,
                            });
                        }

                        allowed = true;
                    } else {
                        if (collected.user.id == interaction.user.id) {
                            await collected.reply({
                                content: 'Cancelled the coinflip',
                                ephemeral: true,
                            });
                            collector.stop();
                        } else {
                            await collected.reply({
                                content: 'You are not the coinflip initiator!',
                                ephemeral: true,
                            });
                            allowed = true;
                        }
                    }
                } else {
                    await collected.reply({
                        content: 'Either too slow or try again in a sec!',
                        ephemeral: true,
                    });
                }
            }
        });

        collector.on('end', async () => {
            // Remove the buttons after the interaction ends

            if (!coinflip_ended) {
                row.components.forEach((button) => button.setDisabled(true));

                bet_message
                    .edit({
                        content: `Coinflip cancelled!`,
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
                            false,
                            true,
                        );
                    } catch (error) {
                        console.error(error); // add error handling for levelUp functio
                    }
                }
            }
        });
    },
};
