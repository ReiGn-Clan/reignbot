const { SlashCommandBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const { mongoUris, faceitDbEnvironment } = require('../dev_config.json');

const client = new MongoClient(mongoUris[3].faceitDatabase);
const db = client.db(faceitDbEnvironment);
const collection = db.collection('usernames');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('updatefaceitname')
        .setDescription("Update your faceit name if you've changed it")
        .addStringOption((option) =>
            option
                .setName('faceitusername')
                .setDescription('Your FaceIt username')
                .setRequired(true),
        ),

    async execute(interaction) {
        let faceitUsername = interaction.options.getString('faceitusername');
        let discordUsername = interaction.user.username;

        const existingEntry = await collection.findOne({ discordUsername });
        if (existingEntry) {
            const updatedEntry = { $set: { faceitUsername } };
            await collection.updateOne({ discordUsername }, updatedEntry);
            await interaction.reply(
                `Updated ${discordUsername}'s FaceIt username to ${faceitUsername}`,
            );
            return;
        } else {
            await interaction.reply(
                'Unable to find your FaceIt username in the database, maybe try /setfaceitname?',
            );
        }
    },
};
