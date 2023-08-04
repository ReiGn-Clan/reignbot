const { SlashCommandBuilder } = require('discord.js');
const faceitIntegration = require('../src/modules/faceit_integration');
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { faceitDbEnvironment } = require('../dev_config.json');
const db = mongo_bongo.getDbInstance(faceitDbEnvironment);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setfaceitname')
        .setDescription(
            'Link your discord and faceit name to receive token awards',
        )
        .addStringOption((option) =>
            option
                .setName('faceitusername')
                .setDescription('Your FaceIt username')
                .setRequired(true),
        ),

    async execute(interaction) {
        const collection = db.collection('usernames');
        let faceitUsername = interaction.options
            .getString('faceitusername')
            .toLowerCase();
        let allHubMembers = await faceitIntegration.parseNicknames();
        let discordUsername = interaction.user.username;

        //user not found in hub member array
        if (!allHubMembers.includes(faceitUsername)) {
            await interaction.reply(
                `${faceitUsername} not found in the FaceIt hub!`,
            );
            return;
        }

        if (allHubMembers.includes(faceitUsername)) {
            let hasLeveledUp = await Levels.appendXp(
                interaction.user.id,
                interaction.guild.id,
                5000,
            );

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
            let discordUserID = interaction.user.id;
            //no entry exists and the user is in the hub, bongo into mongo
            const dataEntry = {
                discordUsername,
                discordUserID,
                faceitUsername,
            };
            await collection.insertOne(dataEntry);
            await interaction.reply({
                content: `Successfully linked ${discordUsername} (Discord) to ${faceitUsername} (FaceIt). You were awarded 5000 tokens!`,
                ephemeral: true,
            });
        }
    },
};
