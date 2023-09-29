const { SlashCommandBuilder } = require('discord.js');
const faceitIntegration = require('../src/modules/faceit_integration');
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

        const lower_case_username = faceitUsername.toLowerCase();
        const existingEntry = await collection.findOne({ discordUsername });
        const name_exists_already = await collection.findOne({
            faceitUsername: lower_case_username,
        });

        if (name_exists_already !== null) {
            await interaction.reply({
                content: `This name has already been used!`,
                ephemeral: true,
            });
            return;
        }

        if (existingEntry) {
            // Check if the new username exists
            const joinedFaceit =
                await faceitIntegration.findUser(faceitUsername);

            if (!joinedFaceit) {
                await interaction.reply({
                    content: `${faceitUsername} not found in the FaceIt hub!`,
                    ephemeral: true,
                });
                return;
            } else {
                await interaction.reply({
                    content: `Updated ${discordUsername}'s FaceIt username to ${faceitUsername}`,
                    ephemeral: true,
                });

                faceitUsername = faceitUsername.toLowerCase();
                const updatedEntry = { $set: { faceitUsername } };
                await collection.updateOne({ discordUsername }, updatedEntry);
            }

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
