const { config_to_use } = require('../../general_config.json');
const mongo_bongo = require('../utils/mongo_bongo.js');
const { discordAPIBotStuff, variousIDs, twitchSecrets, twitchDBEnv } = require(
    `../../${config_to_use}`,
);
const axios = require('axios');

const clientId = twitchSecrets.clientId;
const clientSecret = twitchSecrets.clientSecret;

const db = mongo_bongo.getDbInstance(twitchDBEnv);

let discordClient;
let accessToken;

// Function to set the client
function setClient(client) {
    discordClient = client;
}

// Function to authenticate and get an access token
async function authenticate() {
    const response = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    );
    accessToken = response.data.access_token;
}

// Function to get the broadcasterId
async function getBroadcasterId(broadcasterName) {
    try {
        const response = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': clientId,
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                login: broadcasterName,
            },
        });

        if (response.data && response.data.data.length > 0) {
            const broadcasterId = response.data.data[0].id;
            console.log(
                `Broadcaster ID for ${broadcasterName}: ${broadcasterId}`,
            );
            return broadcasterId;
        } else {
            console.log('User not found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching broadcaster ID:', error.message);
        return null;
    }
}

async function subscribeOnlineOffline(broadcasterId) {
    await subscribeToEventSub('stream.online', broadcasterId);
    await subscribeToEventSub('stream.offline', broadcasterId);
}

// Function to subscribe to an EventSub topic
async function subscribeToEventSub(topic, broadcasterId) {
    const callbackUrl = `https://webserver.reignclan.org/webhook/callback`; // Replace with your server's callback URL
    try {
        const response = await axios.post(
            `https://api.twitch.tv/helix/eventsub/subscriptions`,
            {
                type: topic,
                version: '1',
                condition: {
                    broadcaster_user_id: broadcasterId,
                },
                transport: {
                    method: 'webhook',
                    callback: callbackUrl,
                    secret: clientSecret, // Replace with a secret string for verifying signatures
                },
            },
            {
                headers: {
                    'Client-ID': clientId,
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        console.log(response.data);
    } catch (error) {
        console.error('Error creating subscription', error.message);
        return null;
    }
}

async function handleEventsub(eventType, broadcasterName) {
    if (eventType === 'stream.online') {
        console.log(`Stream started by ${broadcasterName}`);
        handleGoLive(broadcasterName);
    } else if (eventType === 'stream.offline') {
        console.log(`Stream stopped by ${broadcasterName}`);
        handleGoOffline(broadcasterName);
    }
}

async function handleGoLive(whichStreamer) {
    const collection = db.collection('streamers');
    const guild = await discordClient.guilds.cache.get(
        discordAPIBotStuff[1].guildID,
    );
    const liveRole = await guild.roles.cache.get('1157008708165959680');
    const channel = await discordClient.channels.fetch(
        variousIDs[5].socialUpdatesChannel,
    );

    let member = null;
    let messageObj = {
        followerMention: null,
        memberToPing: null,
        streamLink: null,
    };

    const data = await collection.findOne({ twitchUsername: whichStreamer });

    console.log(data);

    member = await guild.members.fetch(data.userId);
    messageObj.followerMention = `<@&${data.roleId}>`;
    messageObj.memberToPing = data.userId;
    messageObj.streamLink = `https://www.twitch.tv/${whichStreamer}`;

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

async function handleGoOffline(whichStreamer) {
    const collection = db.collection('streamers');
    const guild = await discordClient.guilds.cache.get(
        discordAPIBotStuff[1].guildID,
    );
    const liveRole = await guild.roles.cache.get('1157008708165959680');

    const data = await collection.findOne({ twitchUsername: whichStreamer });

    let member = null;

    member = await guild.members.fetch(data.userId);

    const hasRole = member.roles.cache.some(
        (role) => role.name === liveRole.name,
    );
    if (hasRole) {
        member.roles.remove(liveRole);
        console.log(`Removed role ${liveRole.name} from ${whichStreamer}`);
    } else {
        console.log(`${whichStreamer} doesn't have LIVE role, skipping.`);
        return;
    }
}

async function deleteAllSubscriptions() {
    try {
        // Step 1: List all subscriptions
        const listResponse = await axios.get(
            'https://api.twitch.tv/helix/eventsub/subscriptions',
            {
                headers: {
                    'Client-ID': clientId,
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        );

        const subscriptions = listResponse.data.data;

        // Step 2: Delete each subscription
        for (const subscription of subscriptions) {
            await axios.delete(
                'https://api.twitch.tv/helix/eventsub/subscriptions',
                {
                    headers: {
                        'Client-ID': clientId,
                        Authorization: `Bearer ${accessToken}`,
                    },
                    params: {
                        id: subscription.id,
                    },
                },
            );

            console.log(`Deleted subscription with ID: ${subscription.id}`);
        }

        console.log('All subscriptions have been deleted.');
    } catch (error) {
        console.error(`Error deleting subscriptions: ${error}`);
    }
}

// Function to create all the initial subscriptions to events
async function botStartup() {
    await authenticate();
    await deleteAllSubscriptions();
    const collection = db.collection('streamers');
    // Find all documents in the collection
    const allDocs = await collection.find({}).toArray(); // Converts to array to iterate

    // Iterate over each document
    allDocs.forEach(async (doc) => {
        await subscribeOnlineOffline(doc.twitchUserId);
    });
}

module.exports = {
    setClient,
    handleEventsub,
    getBroadcasterId,
    subscribeOnlineOffline,
    botStartup,
};
