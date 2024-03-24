const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { gamblingDbEnvironment } = require(`../${config_to_use}`);
const db = mongo_bongo.getDbInstance(gamblingDbEnvironment);
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createbet')
        .setDescription('Creates a bet')
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of the bet')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('description')
                .setDescription('Description of the bet')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('option_1')
                .setDescription('Option 1 to bet on')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('option_2')
                .setDescription('Option 2 to bet on')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('time')
                .setDescription('How long users can bet for (minutes)')
                .setRequired(true),
        ),

    async execute(interaction) {
        const bets = await db.collection('bets');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const option_1 = interaction.options.getString('option_1');
        const option_2 = interaction.options.getString('option_2');
        const time = interaction.options.getInteger('time') * 60 * 1000;

        const button_option_1 = new ButtonBuilder()
            .setCustomId('option_1')
            .setLabel(option_1)
            .setStyle(ButtonStyle.Primary);

        const button_option_2 = new ButtonBuilder()
            .setCustomId('option_2')
            .setLabel(option_2)
            .setStyle(ButtonStyle.Success);

        const CancelButton = new ButtonBuilder()
            .setCustomId('cancelbet')
            .setLabel('Cancel Bet')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(
            button_option_1,
            button_option_2,
            CancelButton,
        );

        let all_bets = [];
        let option_1_total = 0;
        let option_2_total = 0;
        let members_betted = [];

        // Let the user know they created a bet
        await interaction.reply({ content: 'Created a bet!', ephemeral: true });

        // Send the bet to the channel
        let bet_message = null;

        interaction.channel
            .send({
                content: `A bet has been created! The bet is: ${description} \n The current standing = ${option_1}: **${50}%**  - ${option_2}: **${50}%**`,
                components: [row],
            })
            .then(async (sent) => {
                bet_message = sent;
            });

        let betting_time_ended = false;

        // Create collector for button clicks
        const collector = interaction.channel.createMessageComponentCollector({
            time: time,
        });

        collector.on('collect', async (collected) => {
            if (collected.message === bet_message) {
                if (!members_betted.includes(collected.user.id)) {
                    if (collected.customId !== 'cancelbet') {
                        // Prompt the user to enter a number
                        // Test shit
                        const modal = new ModalBuilder()
                            .setCustomId(collected.id)
                            .setTitle('ReiGn XP betting');

                        // Add components to modal

                        // Create the text input components
                        const XPinput = new TextInputBuilder()
                            .setCustomId('xp_modal')
                            // The label is the prompt the user sees for this input
                            .setLabel(
                                'How many ReiGn Tokens do you want to bet?',
                            )
                            // Short means only a single line of text
                            .setStyle(TextInputStyle.Short);

                        // An action row only holds one text input,
                        // so you need one action row per text input.
                        const firstActionRow =
                            new ActionRowBuilder().addComponents(XPinput);

                        // Add inputs to the modal
                        modal.addComponents(firstActionRow);

                        // Show the modal
                        await collected.showModal(modal);

                        // Get the Modal Submit Interaction that is emitted once the User submits the Modal
                        const submitted = await collected
                            .awaitModalSubmit({
                                // Timeout after a minute of not receiving any valid Modals
                                time: 150000,
                                // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
                                filter: (i) =>
                                    i.customId === collected.id &&
                                    i.user.id === collected.user.id,
                            })
                            .catch(() => {
                                // Catch any Errors that are thrown (e.g. if the awaitModalSubmit times out after 60000 ms)
                            });

                        if (submitted != null && betting_time_ended == false) {
                            await submitted.reply({
                                content: 'Bet submitted, verifying..',
                                ephemeral: true,
                            });
                            const modal_xp =
                                submitted.fields.getTextInputValue('xp_modal');

                            // Process the entered number
                            const enteredNumber = parseInt(modal_xp);
                            if (
                                Number.isInteger(enteredNumber) &&
                                enteredNumber > 0
                            ) {
                                const userXP = await Levels.fetch(
                                    collected.user.id,
                                    interaction.guild.id,
                                );

                                if (userXP.xp >= enteredNumber) {
                                    const hasLeveledDown =
                                        await Levels.subtractXp(
                                            collected.user.id,
                                            interaction.guild.id,
                                            enteredNumber,
                                        );

                                    if (hasLeveledDown) {
                                        xp_roles.improvedLevelUp(
                                            interaction.guild,
                                            collected.user.id,
                                            interaction.client,
                                            true,
                                            true,
                                        );
                                    }
                                    collected.followUp({
                                        content: `You bet ${enteredNumber}!`,
                                        ephemeral: true,
                                    });
                                    members_betted.push(collected.user.id);

                                    if (collected.customId == 'option_1') {
                                        option_1_total += enteredNumber;
                                    } else {
                                        option_2_total += enteredNumber;
                                    }

                                    all_bets.push({
                                        user: collected.user.id,
                                        amount: enteredNumber,
                                        option: collected.customId,
                                    });

                                    bet_message
                                        .edit({
                                            content: `A bet has been created! The bet is: ${description} \n The current standing = ${option_1}: **${(
                                                (option_1_total /
                                                    (option_1_total +
                                                        option_2_total)) *
                                                100
                                            ).toFixed(
                                                2,
                                            )}%**  - ${option_2}: **${(
                                                (option_2_total /
                                                    (option_1_total +
                                                        option_2_total)) *
                                                100
                                            ).toFixed(2)}%**`,
                                            components: [row],
                                        })
                                        .then(console.log('Bet Updated'));
                                } else {
                                    collected.followUp({
                                        content: `You do not have enough ReiGn Tokens for this, you only have ${userXP.xp}`,
                                        ephemeral: true,
                                    });
                                }
                            } else {
                                // Invalid input, prompt the user to enter a valid number
                                collected.followUp({
                                    content:
                                        'Invalid input, click a button again and enter a number',
                                    ephemeral: true,
                                });
                            }
                        }
                    } else {
                        collected.reply({
                            content: `You need to bet first before you can cancel!`,
                            ephemeral: true,
                        });
                    }
                } else {
                    if (collected.customId === 'cancelbet') {
                        const found_bet = all_bets.find(
                            (obj) => obj.user === collected.user.id,
                        );
                        const index = all_bets.findIndex(
                            (obj) => obj.name === collected.user.id,
                        );

                        all_bets.splice(index, 1);

                        const index2 = members_betted.indexOf(
                            collected.user.id,
                        );
                        members_betted.splice(index2, 1);

                        if (found_bet.option === 'option_1') {
                            option_1_total -= found_bet.amount;
                        } else {
                            option_2_total -= found_bet.amount;
                        }

                        let hasLeveledUp = await Levels.appendXp(
                            collected.user.id,
                            interaction.guild.id,
                            found_bet.amount,
                        );

                        if (hasLeveledUp) {
                            try {
                                await xp_roles.improvedLevelUp(
                                    interaction.guild,
                                    collected.user.id,
                                    interaction.client,
                                    false,
                                    true,
                                );
                            } catch (error) {
                                console.error(error); // add error handling for levelUp functio
                            }
                        }

                        bet_message
                            .edit({
                                content: `A bet has been created! The bet is: ${description} \n The current standing = ${option_1}: **${(
                                    (option_1_total /
                                        (option_1_total + option_2_total)) *
                                        100 || 0
                                ).toFixed(2)}%**  - ${option_2}: **${(
                                    (option_2_total /
                                        (option_1_total + option_2_total)) *
                                        100 || 0
                                ).toFixed(2)}%**`,
                                components: [row],
                            })
                            .then(console.log('Bet Updated'));

                        collected.reply({
                            content: `Canceled the bet, ${found_bet.amount} ReiGn Tokens added back to account`,
                            ephemeral: true,
                        });
                    } else {
                        collected.reply({
                            content: 'You already betted!',
                            ephemeral: true,
                        });
                    }
                }
            }
        });

        collector.on('end', async () => {
            // Making sure we cant accept new bets
            betting_time_ended = true;

            // Remove the buttons after the interaction ends
            row.components.forEach((button) => button.setDisabled(true));

            if (option_1_total === 0 || option_2_total === 0) {
                bet_message.edit({
                    content: `BET CANCELED, NOT ENOUGH PARTICIPATION RETURNING REIGN TOKENS \n A bet has been created! The bet is: ${description} \n The current standing = ${option_1}: **${(
                        (option_1_total / (option_1_total + option_2_total)) *
                            100 || 0
                    ).toFixed(2)}%**  - ${option_2}: **${(
                        (option_2_total / (option_1_total + option_2_total)) *
                            100 || 0
                    ).toFixed(2)}%**`,
                    components: [row],
                });

                all_bets.forEach(async (obj) => {
                    let hasLeveledUp = await Levels.appendXp(
                        obj.user,
                        interaction.guild.id,
                        obj.amount,
                    );

                    if (hasLeveledUp) {
                        try {
                            await xp_roles.improvedLevelUp(
                                interaction.guild,
                                obj.user,
                                interaction.client,
                            );
                        } catch (error) {
                            console.error(error); // add error handling for levelUp functio
                        }
                    }
                });

                return;
            }

            bet_message.edit({
                content: `BETTING TIME HAS ENDED \n A bet has been created! The bet is: ${description} \n The current standing = ${option_1}: **${(
                    (option_1_total / (option_1_total + option_2_total)) *
                        100 || 0
                ).toFixed(2)}%**  - ${option_2}: **${(
                    (option_2_total / (option_1_total + option_2_total)) *
                        100 || 0
                ).toFixed(2)}%**`,
                components: [row],
            });

            const doc = {
                name: name,
                description: description,
                options: [
                    {
                        option: 1,
                        description: option_1,
                        XPbetted: option_1_total,
                    },
                    {
                        option: 2,
                        description: option_2,
                        XPbetted: option_2_total,
                    },
                ],
                bets: all_bets,
                active: true,
            };

            await bets.insertOne(doc);
        });
    },
};
