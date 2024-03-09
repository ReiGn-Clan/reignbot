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



module.exports = {
    setClient,
    handleEventsub,
    getBroadcasterId,
    subscribeOnlineOffline,
    botStartup,
};
