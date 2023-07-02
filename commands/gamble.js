const { MongoClient } = require('mongodb');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/gambling`;
const client = new MongoClient(uri);
const db = client.db('gambling');
const gambling = require('../src/modules/gambling_is_cool.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Create a gamble')
        .addStringOption((option) =>
            option
                .setName('game')
                .setDescription('The game to play')
                .setRequired(true)
                .addChoices(
                    { name: 'Dice', value: 'dice' },
                    { name: 'CoinToss', value: 'cointoss' },
                ),
        )
        .addIntegerOption((option) =>
            option
                .setName('bet_amount')
                .setDescription('The amount the user wants to bet')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100000),
        ),

    async execute(interaction) {
        const member = interaction.member;
        console.log(member);
        const channelID = interaction.channelId;
        const client = interaction.client;
        const game = interaction.options.getString('game');
        const XP = interaction.options.getInteger('bet_amount');

        gambling.makeGamble(client, member, channelID, game, XP);

        await interaction.reply('Created gamble!');
    },
};
