const { MongoClient } = require('mongodb');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/gambling`;
const client = new MongoClient(uri);
const db = client.db('gambling');
const Levels = require('discord-xp');
const xp_roles = require('../src/modules/xp_roles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('concludebet')
        .setDescription('conclude a bet')
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of the bet')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('option')
                .setDescription('winning option of the bet')
                .setRequired(true),
        ),
    async execute(interaction) {
        const name = interaction.options.getString('name');
        const winning_option = interaction.options.getInteger('option');

        const bets = await db.collection('bets');

        const bet = await bets.findOne({ _id: name });
        if (bet === null || bet === undefined) {
            await interaction.reply('There is no existing bet');
            return;
        }

        await interaction.reply({
            content: `The bet ${name} has been concluded, ${bet.options[winning_option]} has won. User rewarding starts now!`,
        });

        //calculate ratio

        // Reward the users who got it correct
        bet.bets.forEach(async function (item) {
            let hasLeveledUp = await Levels.appendXp(
                item,
                interaction.guild.id,
                1000,
            ).catch(console.error); // add error handling for appendXp function

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

            console.log('Done for user', item);
        });
    },
};
