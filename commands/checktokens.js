const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
const fs = require('node:fs');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { shopDbEnvironment } = require(`../${config_to_use}`);
const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8');
const levelOrder = JSON.parse(levelNamesData).names;
const db = mongo_bongo.getDbInstance(shopDbEnvironment);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checktokens')
        .setDescription('Check how much ReiGn Tokens a user has.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to check the ReiGn Tokens of')
                .setRequired(true),
        ),
    async execute(interaction) {
        const shop_items = await db.collection('shop_items');
        const user = interaction.options.getUser('user');
        const member =
            interaction.options.getMember('user') ||
            (await interaction.guild.members.fetch(user.id));
        const name = member.nickname || user.username;

        const userXP = await Levels.fetch(user.id, interaction.guild.id);

        let current_rank = await Levels.getRank(
            interaction.user.id,
            interaction.guild.id,
        );

        const next_rank = levelOrder[levelOrder.indexOf(current_rank) + 1];

        // Find the price of the rank in the shop items db
        const rank_listing = await shop_items.findOne({
            name: next_rank,
        });

        if (rank_listing == null) {
            await interaction.reply({
                content: `No new rank found in the store!`,
                ephemeral: true,
            });
            return;
        }

        let tokens_needed = (await rank_listing.price) - userXP.xp;

        if (!userXP) {
            await interaction.reply(`${name} has 0 ReiGn Tokens.`);
        } else {
            if (tokens_needed > 0) {
                await interaction.reply({
                    content: `Person has **${userXP.xp}** ReiGn Tokens, and needs ${tokens_needed} ReiGn Tokens to buy the next rank **'${rank_listing.name}'**!`,
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: `Person has **${userXP.xp}** ReiGn Tokens, and can buy the next rank **'${rank_listing.name}'**!`,
                    ephemeral: true,
                });
            }
        }
    },
};
