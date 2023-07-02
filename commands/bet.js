const { MongoClient } = require('mongodb');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/gambling`;
const client = new MongoClient(uri);
const db = client.db('gambling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bet')
        .setDescription('Bet XP on a bet')
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of the bet')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('option')
                .setDescription('Option to bet on')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(2),
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
        const bets = await db.collection('bets');
        const name = interaction.options.getString('name');
        const option = interaction.options.getInteger('option');
        const bet_amount = interaction.options.getInteger('bet_amount');

        let doc = await bets.findOne({ _id: name });

        doc.console.log(doc);

        await interaction.reply('temp');
    },
};
