const { SlashCommandBuilder } = require('discord.js');
const faceitIntegration = require('../src/modules/faceit_integration');
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { faceitDbEnvironment } = require(`../${config_to_use}`);
const db = mongo_bongo.getDbInstance(faceitDbEnvironment);
const token_rates = require('../token_rates.json');

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
        let faceitUsername = interaction.options.getString('faceitusername');

        const already_set = await collection.findOne({
            discordUserID: interaction.user.id,
        });

        const lower_case_username = faceitUsername.toLowerCase();
        const name_exists_already = await collection.findOne({
            faceitUsername: lower_case_username,
        });

        if (already_set !== null) {
            await interaction.reply({
                content: `You already set your username previously! Use /updatefaceitname instead!`,
                ephemeral: true,
            });
            return;
        }

        if (name_exists_already !== null) {
            await interaction.reply({
                content: `This name has already been used!`,
                ephemeral: true,
            });
            return;
        }

        const joinedFaceit = await faceitIntegration.findUser(faceitUsername);
        let discordUsername = interaction.user.username;

        //user not found in hub member array
        if (!joinedFaceit) {
            await interaction.reply({
                content: `${faceitUsername} not found in the FaceIt hub!`,
                ephemeral: true,
            });
            return;
        } else {
            let hasLeveledUp = await Levels.appendXp(
                interaction.user.id,
                interaction.guild.id,
                token_rates.faceitUsernameReward,
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
            await interaction.reply({
                content: `Successfully linked ${discordUsername} (Discord) to ${faceitUsername} (FaceIt). You were awarded **${token_rates.faceitUsernameReward}** tokens!`,
                ephemeral: true,
            });
            faceitUsername = faceitUsername.toLowerCase();
            //no entry exists and the user is in the hub, bongo into mongo
            const dataEntry = {
                discordUsername,
                discordUserID,
                faceitUsername,
            };
            await collection.insertOne(dataEntry);
        }
    },
};
