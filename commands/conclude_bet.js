const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require('discord.js');

const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { gamblingDbEnvironment } = require(`../${config_to_use}`);
const db = mongo_bongo.getDbInstance(gamblingDbEnvironment);
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('concludebet')
        .setDescription('conclude a bet'),

    async execute(interaction) {
        const bets = await db.collection('bets');

        const bet_array = await bets
            .aggregate([
                {
                    $match: {
                        active: true,
                    },
                },
            ])
            .toArray();

        if (bet_array.length === 0) {
            await interaction.reply({
                content: 'There is no existing bets',
                ephemeral: true,
            });
            return;
        }

        let menu_options = [];

        bet_array.forEach(async function (item) {
            const string_option = new StringSelectMenuOptionBuilder()
                .setLabel(item.name)
                .setDescription(item.description)
                .setValue(item.name);

            menu_options.push(string_option);
        });

        const select = new StringSelectMenuBuilder()
            .setCustomId('bets_list')
            .setPlaceholder('Make a selection!')
            .addOptions(menu_options);

        const row_dropdown = new ActionRowBuilder().addComponents(select);

        await interaction.reply({
            content: 'Choose your bet!',
            components: [row_dropdown],
            ephemeral: true,
        });

        // Create collector for button clicks
        const collector = interaction.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
        });

        collector.on('collect', async (collected) => {
            console.log('Collected');

            const bet_id = collected.values[0];

            const found_bet = bet_array.find((obj) => obj.name === bet_id);

            const button_option_1 = new ButtonBuilder()
                .setCustomId('option_1')
                .setLabel(found_bet.options[0].description)
                .setStyle(ButtonStyle.Primary);

            const button_option_2 = new ButtonBuilder()
                .setCustomId('option_2')
                .setLabel(found_bet.options[1].description)
                .setStyle(ButtonStyle.Success);

            const row_buttons = new ActionRowBuilder().addComponents(
                button_option_1,
                button_option_2,
            );

            collected.reply({
                content: 'Please select the option that won',
                components: [row_buttons],
                ephemeral: true,
            });

            // Create collector for button clicks
            const collector_btn =
                collected.channel.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60000,
                });

            collector_btn.on('collect', async (button_collected) => {
                row_buttons.components.forEach((button) =>
                    button.setDisabled(true),
                );

                collected.editReply({
                    content: 'Please select the option that won',
                    components: [row_buttons],
                    ephemeral: true,
                });

                button_collected.reply({
                    content: 'Processing the bet!',
                    ephemeral: true,
                });

                const convertor = { option_1: 0, option_2: 1 };

                interaction.channel.send({
                    content: `A bet has been concluded! The bet was: *${
                        found_bet.description
                    }*, the option: **${
                        found_bet.options[convertor[button_collected.customId]]
                            .description
                    }** has won. ReiGn Tokens will be handed out shortly to the winners!`,
                });

                // Calculate the odds:

                let odds = null;

                console.log(found_bet);

                if (button_collected.customId === 'option_1') {
                    odds =
                        found_bet.options[1].XPbetted /
                            found_bet.options[0].XPbetted +
                        1;
                } else {
                    odds =
                        found_bet.options[0].XPbetted /
                            found_bet.options[1].XPbetted +
                        1;
                }

                console.log(odds);

                found_bet.bets.forEach(async (obj) => {
                    if (obj.option === button_collected.customId) {
                        let hasLeveledUp = await Levels.appendXp(
                            obj.user,
                            interaction.guild.id,
                            obj.amount * odds,
                        );

                        if (hasLeveledUp) {
                            try {
                                await xp_roles.improvedLevelUp(
                                    interaction.guild,
                                    obj.user,
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

                await bets.updateOne(
                    { _id: found_bet._id },
                    { $set: { active: false } },
                );

                collector_btn.stop();
                collector.stop();
            });

            collector_btn.on('end', async () => {
                console.log('Time is over');
            });
        });

        collector.on('end', async () => {
            // Remove the buttons after the interaction ends
            console.log('Time ended');
        });
    },
};
