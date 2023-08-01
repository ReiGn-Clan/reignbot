const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require('discord.js');
const fs = require('node:fs');
const { mongoUris } = require('../dev_config.json');
const { MongoClient } = require('mongodb');
const client = new MongoClient(mongoUris[3].shopDatabase);

const Levels = require('discord-xp');

const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8');
const levelOrder = JSON.parse(levelNamesData).names;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Open the shop'),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(
            interaction.user.id,
        );
        const shop_items = await client.db('shop_items');

        // List the different shop categories
        let category_array = await shop_items
            .aggregate([
                {
                    $group: {
                        _id: '$category',
                    },
                },
                {
                    $project: {
                        _id: 0,
                        category: '$_id',
                    },
                },
            ])
            .toArray();

        category_array = category_array.map((entry) => entry.category);

        let menu_options = [];

        category_array.forEach(async function (item) {
            const string_option = new StringSelectMenuOptionBuilder()
                .setLabel(item)
                .setDescription(`Browse ${item} for sale here!`)
                .setValue(item);

            menu_options.push(string_option);
        });

        const select = new StringSelectMenuBuilder()
            .setCustomId('category_list')
            .setPlaceholder('Make a selection!')
            .addOptions(menu_options);

        const row_dropdown = new ActionRowBuilder().addComponents(select);

        let og_message = await interaction.reply({
            content: 'Select a shop category',
            ephemeral: true,
            components: [row_dropdown],
        });

        // Create collector for button clicks
        const collector = interaction.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
        });

        collector.on('collect', async (collected) => {
            if (collected.message == og_message) {
                console.log('Collected');

                const shop_type = collected.values[0];

                switch (shop_type) {
                    case 'Ranks': {
                        // Retrieve what the current rank is:
                        let current_roles = member._roles;
                        let current_rank = current_roles.filter((x) =>
                            levelOrder.includes(x),
                        );
                        const next_rank =
                            levelOrder[levelOrder.indexOf(current_rank) + 1];

                        // Find the price of the rank in the shop items db
                        const rank_listing = await shop_items.findOne({
                            name: next_rank,
                        });

                        const button_option_1 = new ButtonBuilder()
                            .setCustomId('yes')
                            .setLabel('Yes')
                            .setStyle(ButtonStyle.Success);

                        const button_option_2 = new ButtonBuilder()
                            .setCustomId('no')
                            .setLabel('No')
                            .setStyle(ButtonStyle.Danger);

                        const row_buttons =
                            new ActionRowBuilder().addComponents(
                                button_option_1,
                                button_option_2,
                            );

                        await collected.reply({
                            content: `You can buy the next rank: ${rank_listing.name} for ${rank_listing.price} ReiGn Tokens.\nWould you like to?`,
                            ephemeral: true,
                            components: row_buttons,
                        });

                        // Make button collector
                        const collector_btn =
                            collected.channel.createMessageComponentCollector({
                                componentType: ComponentType.Button,
                                time: 60000,
                            });

                        collector_btn.on(
                            'collect',
                            async (button_collected) => {
                                row_buttons.components.forEach((button) =>
                                    button.setDisabled(true),
                                );

                                collected.editReply({
                                    content: `You can buy the next rank: ${rank_listing.name} for ${rank_listing.price} ReiGn Tokens.\nWould you like to?`,
                                    components: [row_buttons],
                                    ephemeral: true,
                                });

                                if (button_collected.customId == 'yes') {
                                    const userXP = await Levels.fetch(
                                        interaction.user.id,
                                        interaction.guild.id,
                                    );

                                    if (userXP.xp <= rank_listing.price) {
                                        await button_collected.reply({
                                            content:
                                                'You do not have enough tokens for this!',
                                            ephemeral: true,
                                        });
                                        collector_btn.stop();
                                        return;
                                    }

                                    await Levels.subtractXp(
                                        interaction.user.id,
                                        interaction.guild.id,
                                        rank_listing.price,
                                    );

                                    button_collected.reply({
                                        content:
                                            'Thank you for your purchase, processing the new rank!',
                                        ephemeral: true,
                                    });

                                    const role =
                                        await interaction.guild.roles.cache.find(
                                            (role) => role.name === next_rank,
                                        );
                                    const previousRole =
                                        await interaction.guild.roles.cache.find(
                                            (role) =>
                                                role.name === current_rank,
                                        );

                                    await member.roles.remove(previousRole);
                                    await member.roles.add(role);
                                    collector_btn.stop();
                                    collector.stop();
                                } else {
                                    await button_collected.reply({
                                        content: 'Maybe next time!',
                                        ephemeral: true,
                                    });
                                    collector_btn.stop();
                                    collector.stop();
                                }
                            },
                        );
                        break;
                    }
                    case 'items': {
                        interaction.reply({
                            content: 'No items in the shop yet!',
                            ephemeral: true,
                        });
                        collector.stop();
                        break;
                    }
                }
            }
        });
    },
};
