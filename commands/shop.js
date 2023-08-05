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
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { variousIDs, shopDbEnvironment } = require('../dev_config.json');
const db = mongo_bongo.getDbInstance(shopDbEnvironment);
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');
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
        const shop_items = await db.collection('shop_items');
        const receipts = await db.collection('receipts');

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
            if (collected.message.interaction.id === og_message.id) {
                console.log('Collected');

                const shop_type = collected.values[0];

                switch (shop_type) {
                    case 'ranks': {
                        // Retrieve what the current rank is:
                        let current_roles = member._roles;

                        const current_role_promises = current_roles.map(
                            async (item) => {
                                return await interaction.guild.roles.fetch(
                                    item,
                                );
                            },
                        );

                        const current_role_objects = await Promise.all(
                            current_role_promises,
                        );

                        const current_role_names = current_role_objects.map(
                            (role) => role.name,
                        );

                        let current_rank = current_role_names.filter((x) =>
                            levelOrder.includes(x),
                        )[0];

                        const next_rank =
                            levelOrder[levelOrder.indexOf(current_rank) + 1];

                        // Find the price of the rank in the shop items db
                        const rank_listing = await shop_items.findOne({
                            name: next_rank,
                        });

                        if (rank_listing == null) {
                            await collected.reply({
                                content: `No new rank found in the store!`,
                                ephemeral: true,
                            });

                            collector.stop();
                            return;
                        }

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

                        let buy_reply;
                        if ('description' in rank_listing) {
                            buy_reply = await collected.reply({
                                content: `You can buy the next rank: **${rank_listing.name}** for **${rank_listing.price}** ReiGn Tokens.\nWould you like to?\n\n**Rank description:** ${rank_listing.description}`,
                                ephemeral: true,
                                components: [row_buttons],
                            });
                        } else {
                            buy_reply = await collected.reply({
                                content: `You can buy the next rank: **${rank_listing.name}** for **${rank_listing.price}** ReiGn Tokens.\nWould you like to?`,
                                ephemeral: true,
                                components: [row_buttons],
                            });
                        }

                        // Make button collector
                        const collector_btn =
                            collected.channel.createMessageComponentCollector({
                                componentType: ComponentType.Button,
                                time: 60000,
                            });

                        collector_btn.on(
                            'collect',
                            async (button_collected) => {
                                if (
                                    buy_reply.interaction.message.id ===
                                    button_collected.message.reference.messageId
                                ) {
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

                                        const hasLeveledDown =
                                            await Levels.subtractXp(
                                                interaction.user.id,
                                                interaction.guild.id,
                                                rank_listing.price,
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

                                        button_collected.reply({
                                            content:
                                                'Thank you for your purchase, processing the new rank!',
                                            ephemeral: true,
                                        });

                                        const role =
                                            await interaction.guild.roles.cache.find(
                                                (role) =>
                                                    role.name === next_rank,
                                            );

                                        const previousRole =
                                            await interaction.guild.roles.cache.find(
                                                (role) =>
                                                    role.name === current_rank,
                                            );

                                        await member.roles.remove(previousRole);
                                        await member.roles.add(role);

                                        const channel =
                                            await interaction.client.channels.fetch(
                                                variousIDs[1].generalChannel,
                                            );

                                        await channel.send(
                                            `${member.user}, has bought the rank **${next_rank}**!`,
                                        );

                                        const user_receipt = {
                                            userId: interaction.user.id,
                                            itemId: rank_listing._id,
                                            item: rank_listing.name,
                                            price: rank_listing.price,
                                        };

                                        await receipts.insertOne(user_receipt);

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
                                }
                            },
                        );
                        collector_btn.on('end', async () => {
                            // Remove the buttons after the interaction ends

                            row_buttons.components.forEach((button) =>
                                button.setDisabled(true),
                            );

                            await collected.editReply({
                                content: `You can buy the next rank: ${rank_listing.name} for ${rank_listing.price} ReiGn Tokens.\nWould you like to?`,
                                components: [row_buttons],
                                ephemeral: true,
                            });
                        });
                        break;
                    }
                    case 'items': {
                        collected.reply({
                            content: 'No items in the shop yet!',
                            ephemeral: true,
                        });
                        collector.stop();
                        break;
                    }
                }
            }
        });
        collector.on('end', async () => {
            // Remove the buttons after the interaction ends

            await interaction.editReply({
                content: 'Select a shop category',
                ephemeral: true,
                components: [],
            });
        });
    },
};
