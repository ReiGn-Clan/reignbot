const { MongoClient } = require('mongodb');
const { SlashCommandBuilder } = require('discord.js');
const mongoUris = require('../dev_config.json');
const client = new MongoClient(
    'mongodb+srv://admin:vZxUHrWiAWpVNVOdG@cluster0.jialcet.mongodb.net/dev_gambling',
);
const db = client.db('gambling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deletebet')
        .setDescription('Lists the existing bets')
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of the bet')
                .setRequired(true),
        ),

    async execute(interaction) {
        const bets = await db.collection('bets');

        const name = interaction.options.getString('name');

        await bets.deleteOne({ _id: name });

        await interaction.reply(`Deleted ${name}`);
    },
};
