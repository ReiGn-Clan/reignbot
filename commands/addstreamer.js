const { SlashCommandBuilder } = require('discord.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const twitch_integration = require('../src/modules/twitch_integration');
const { config_to_use } = require('../general_config.json');
const { twitchDBEnv } = require(`../${config_to_use}`);
const db = mongo_bongo.getDbInstance(twitchDBEnv);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addstreamer')
        .setDescription('Add a streamer to the go live panel')
        .addUserOption((option) =>
            option
                .setName('discorduser')
                .setDescription('The user in the discord server')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('twitchusername')
                .setDescription('The Twitch username')
                .setRequired(true),
        )
        .addRoleOption((option) =>
            option
                .setName('notifrole')
                .setDescription(
                    'The role that should get pinged when streamer goes live',
                )
                .setRequired(true),
        ),

    async execute(interaction) {
        const collection = db.collection('streamers');
        const twitchUsername = interaction.options.getString('twitchusername');
        const discordUser = interaction.options.getUser('discorduser');
        const discordRole = interaction.options.getRole('notifrole');

        const already_set = await collection.findOne({
            userId: discordUser.id,
        });

        if (already_set !== null) {
            await interaction.reply({
                content: `Steamer already exists!`,
                ephemeral: true,
            });
            return;
        }

        const broadcasterId =
            await twitch_integration.getBroadcasterId(twitchUsername);

        if (broadcasterId == null) {
            await interaction.reply({
                content: `Error fetching user, check if name entered correctly`,
                ephemeral: true,
            });

            return;
        }

        await collection.insertOne({
            userId: discordUser.id,
            roleId: discordRole.id,
            twitchUserId: broadcasterId,
            twitchUsername: twitchUsername,
        });

        twitch_integration.subscribeOnlineOffline(broadcasterId);

        await interaction.reply({
            content: `Streamer ${twitchUsername} added!`,
            ephemeral: true,
        });
    },
};
