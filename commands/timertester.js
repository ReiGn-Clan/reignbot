const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
const { config_to_use } = require('../general_config.json');

const xp_roles = require('../src/modules/xp_roles.js');
const { discordAPIBotStuff, variousIDs } = require(`../${config_to_use}`);
const timers = require('../src/utils/timers.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timertester')
        .setDescription('DEV command to test timer'),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(
            interaction.user.id,
        );

        if (member === undefined) {
            console.log('User is not in the server!');
            return;
        }

        let hasLeveledUp = await Levels.appendXp(
            interaction.user.id,
            discordAPIBotStuff[1].guildID,
            1500,
            console.log('Awarded tokens for voting!'),
        );
        const channel = await interaction.client.channels.fetch(
            variousIDs[0].userUpdatesChannel,
        );

        await channel.send({
            content: `${member.user} has earned **1500** ReiGn Tokens for testing the timer :KEKW:`,
        });

        if (hasLeveledUp) {
            try {
                await xp_roles.improvedLevelUp(
                    interaction.guild,
                    interaction.user.id,
                    interaction.client,
                );
            } catch (error) {
                console.error(error);
            }
        }

        // Start reminder for in 12 hours

        // First check if users has role

        const hasRole = member.roles.cache.has('1151195100089688154');

        if (hasRole) {
            timers.voteTimer(Date.now() + 60000, channel, member);
        }
    },
};
