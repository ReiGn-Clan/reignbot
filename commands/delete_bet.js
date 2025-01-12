const { SlashCommandBuilder } = require('discord.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { gamblingDbEnvironment } = require(`../${config_to_use}`);

const db = mongo_bongo.getDbInstance(gamblingDbEnvironment);

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
