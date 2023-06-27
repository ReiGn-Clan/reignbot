const { MongoClient } = require('mongodb');
const { SlashCommandBuilder } = require('discord.js');
const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/gambling`;
const client = new MongoClient(uri);
const db = client.db('gambling');

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
        ),

    async execute(interaction) {
        const bets = await db.collection('bets');

        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const option_1 = interaction.options.getString('option_1');
        const option_2 = interaction.options.getString('option_2');

        const doc = {
            _id: name,
            description: description,
            option_1: option_1,
            option_2: option_2,
            options: [{ one: option_1, two: option_2 }],
            xp_option_1: 0,
            xp_option_2: 0,
            users_option_1: [],
            users_option_2: [],
        };

        await bets.insertOne(doc);

        await interaction.reply('Created a bet!');
        await interaction.channel.send({
            content: `A bet has been created! The bet is: ${description} \nBet now with with either \n\n/*bet ${name} ${option_1}*\n\nor\n\n*/bet ${name} ${option_2}*`,
        });
    },
};
