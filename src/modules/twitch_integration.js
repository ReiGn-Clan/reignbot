const { config_to_use } = require('../../general_config.json');
const { discordAPIBotStuff, variousIDs, streamers, twitchSecrets } = require(`../../${config_to_use}`);

const ApiClient = require('@twurple/api');
const auth = require('@twurple/auth');
const clientId = twitchSecrets.clientId;
const clientSecret = twitchSecrets.clientSecret;
const authProvider = new auth.AppTokenAuthProvider(clientId, clientSecret);
const newApiObj = new ApiClient.ApiClient({ authProvider });

async function isLive(client) {
    const rose = await newApiObj.users.getUserByName('phoenixrose24');
    const avid = await newApiObj.users.getUserByName('notsureifavid');

    if (!rose || !avid) {
        return;
    }

    const roseSubscription = await newApiObj.streams.getStreamByUserId(rose);
    const avidSubscription = await newApiObj.streams.getStreamByUserId(avid);
    let whichStreamer = null;

    if (roseSubscription !== (undefined || null)) {
        whichStreamer = 'phoenixrose24';
        handleGoLive(client, whichStreamer);
    } else if (avidSubscription !== (undefined || null)) {
        whichStreamer = 'notsureifavid';
        handleGoLive(client, whichStreamer);
    } else {
        handleGoOffline(client, whichStreamer);
        return;
    }
}

async function handleGoLive(client, whichStreamer) {
    const guild = await client.guilds.cache.get(discordAPIBotStuff[1].guildID);
    const liveRole = await guild.roles.cache.get('1157008708165959680');
    const channel = await client.channels.fetch(
        variousIDs[5].socialUpdatesChannel,
    );

    let member = null;
    let messageObj = {
        followerMention: null,
        memberToPing: null,
        streamLink: null
    }

    if (whichStreamer === 'notsureifavid') {
        member = await guild.members.fetch(streamers.avid.discordUserId);
        messageObj.followerMention = `@&${streamers.avid.followerRoleId}`;
        messageObj.memberToPing = streamers.avid.discordUserId;
        messageObj.streamLink = streamers.avid.streamLink;
    } else {
        member = await guild.members.fetch(streamers.rose.discordUserId);
        messageObj.followerMention = `@&${streamers.rose.followerRoleId}`;
        messageObj.memberToPing = streamers.rose.discordUserId;
        messageObj.streamLink = streamers.rose.streamLink;
    }

    const hasRole = member.roles.cache.some(
        (role) => role.name === liveRole.name,
    );
    if (hasRole) {
        console.log('User already has live role! Skipping message');
        return;
    } else {
        await channel.send(
            `${messageObj.followerMention}, <@${messageObj.memberToPing}> has gone live! Check out their stream at ${messageObj.streamLink}`,
        );
    }

    member.roles
        .add(liveRole)
        .then(() => {
            console.log(
                `Added role ${liveRole.name} to ${messageObj.memberToPing}.`,
            );
        })
        .catch((error) => {
            console.error(error);
        });
}

async function handleGoOffline(client, whichStreamer) {
    const guild = await client.guilds.cache.get(discordAPIBotStuff[1].guildID);
    const liveRole = await guild.roles.cache.get('1157008708165959680');

    let member = null;
    if (whichStreamer === 'notsureifavid') {
        member = await guild.members.fetch(streamers.avid.discordUserId);
    } else{
        member = await guild.members.fetch(streamers.rose.discordUserId);
    }


    const hasRole = member.roles.cache.some(
        (role) => role.name === liveRole.name,
    );
    if (hasRole) {
        member.roles.remove(liveRole);
        console.log(
            `Removed role ${liveRole.name} from ${whichStreamer}`,
        );
    } else {
        console.log(
            `${whichStreamer} doesn't have LIVE role, skipping.`,
        );
        return;
    }
}

module.exports = { isLive };
