const { SlashCommandBuilder } = require('discord.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { shopDbEnvironment } = require(`../${config_to_use}`);

const db = mongo_bongo.getDbInstance(shopDbEnvironment);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listshopitem')
        .setDescription('Lists a shop item')
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of the item')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('description')
                .setDescription('Description of the item')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('price')
                .setDescription('Price of the item')
                .setRequired(true),
        ),

    async execute(interaction) {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const price = interaction.options.getInteger('price');
        const collection = db.collection('shop_items');

        const doc = {
            name: name,
            description: description,
            price: price,
            category: 'items',
        };

        collection
            .insertOne(doc)
            .then(console.log('Added item to the shop'))
            .catch((e) => console.log(`Failed to save new user, error`, e));

        interaction.reply({
            content: `Added ${name} to the shop!`,
            ephemeral: true,
        });
    },
};
