const { SlashCommandBuilder } = require('discord.js');

const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { faceitDbEnvironment } = require(`../${config_to_use}`);
const db = mongo_bongo.getDbInstance(faceitDbEnvironment);

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
        const collection = db.collection('usernames');
        let faceitUsername = interaction.options.getString('faceitusername');
        let discordUsername = interaction.user.username;

        const existingEntry = await collection.findOne({ discordUsername });
        if (existingEntry) {
            const updatedEntry = { $set: { faceitUsername } };
            await collection.updateOne({ discordUsername }, updatedEntry);
            await interaction.reply({
                content: `Updated ${discordUsername}'s FaceIt username to ${faceitUsername}`,
                ephemeral: true,
            });
            return;
        } else {
            await interaction.reply({
                content:
                    'Unable to find your FaceIt username in the database, maybe try /setfaceitname?',
                ephemeral: true,
            });
        }
    },
};
