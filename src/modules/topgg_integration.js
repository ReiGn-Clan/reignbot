const { config_to_use } = require('../../general_config.json');
const Levels = require('../utils/syb_xp.js');
const xp_roles = require('./xp_roles.js');
const { discordAPIBotStuff, variousIDs } = require(`../../${config_to_use}`);
const timers = require('../utils/timers.js');

let discordClient;
function setClient(client) {
    discordClient = client;
}

async function rewardVote(user) {
    const guild = await discordClient.guilds.fetch(
        discordAPIBotStuff[1].guildID,
    );
    const member = await guild.members.fetch(user);

    if (member === undefined) {
        console.log('User is not in the server!');
        return;
    }

    let hasLeveledUp = await Levels.appendXp(
        user,
        discordAPIBotStuff[1].guildID,
        1500,
        console.log('Awarded tokens for voting!'),
    );
    const channel = await discordClient.channels.fetch(
        variousIDs[0].userUpdatesChannel,
    );

    await channel.send({
        content: `${member.user} has earned **1500** ReiGn Tokens for voting on https://top.gg/servers/1089665371923026053 !`,
    });

    if (hasLeveledUp) {
        try {
            await xp_roles.improvedLevelUp(guild, user, discordClient);
        } catch (error) {
            console.error(error);
        }
    }

    // Start reminder for in 12 hours

    // First check if users has role

    const hasRole = member.roles.cache.has('1151195100089688154');

    if (hasRole) {
        timers.voteTimer(Date.now() + 43200000, channel, member);
    }
}

module.exports = { setClient, rewardVote };
