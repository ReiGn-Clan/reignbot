const { config_to_use } = require('../../general_config.json');
const {
    faceitJsonAccept,
    faceitAuth,
    faceitDbEnvironment,
    discordAPIBotStuff,
    variousIDs,
} = require(`../../${config_to_use}`);
const headers = {
    accept: faceitJsonAccept,
    Authorization: faceitAuth,
};

const mongo_bongo = require('../utils/mongo_bongo.js');
const Levels = require('../utils/syb_xp.js');
const xp_roles = require('../modules/xp_roles.js');

const db = mongo_bongo.getDbInstance(faceitDbEnvironment);
const token_rates = require('../../token_rates.json');
let discordClient;

function setClient(client) {
    discordClient = client;
}

async function findUser(faceitUsername) {
    const HubIDs = [
        '0516511f-763f-48ff-9d01-20236fa0b7e7',
        '80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12',
        '7c2d5f1c-879d-4fe8-8b96-8043228030bc',
    ];

    const faceit_user = await FaceitGet(
        `https://open.faceit.com/data/v4/players?nickname=${faceitUsername}`,
    );

    if (faceit_user == null) return;

    const user_hubs = await FaceitGet(
        `https://open.faceit.com/data/v4/players/${faceit_user.player_id}/hubs?offset=0&limit=50`,
    );

    let inOurHub = false;
    user_hubs.items.map((item) => {
        if (HubIDs.includes(item.hub_id)) {
            inOurHub = true;
        }
    });

    return inOurHub;
}

async function rewardParticipants(matchData) {
    const usernamesCollection = db.collection('usernames');
    const awardedMatchesCollection = db.collection('awardedMatches');

    let { nicknames, matchID } = await parseMatches(matchData);
    const alreadyAwarded = await awardedMatchesCollection.findOne({ matchID });
    if (alreadyAwarded) {
        console.log(`MatchID: ${matchID} has already been awarded!`);
        return;
    }

    if (!alreadyAwarded) {
        try {
            // Use MongoDB driver to find players in the database based on lowercase nicknames
            const linkedUsernames = await usernamesCollection
                .find({ faceitUsername: { $in: nicknames } })
                .toArray();
            for (const player of linkedUsernames) {
                if (player.discordUsername) {
                    let hasLeveledUp = await Levels.appendXp(
                        player.discordUserID,
                        discordAPIBotStuff[1].guildID,
                        token_rates.faceitMatchReward,
                        console.log('Awarded xp for match!'),
                    );
                    const channel = await discordClient.channels.fetch(
                        variousIDs[0].userUpdatesChannel,
                    );

                    const guild = await discordClient.guilds.fetch(
                        discordAPIBotStuff[1].guildID,
                    );
                    const member = await guild.members.fetch(
                        player.discordUserID,
                    );
                    await channel.send({
                        content: `${member.user} has earned **${token_rates.faceitMatchReward}** ReiGn Tokens for participating in a custom game!`,
                    });

                    if (hasLeveledUp) {
                        try {
                            await xp_roles.improvedLevelUp(
                                guild,
                                player.discordUserID,
                                discordClient,
                            );
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            }
            await awardedMatchesCollection.insertOne({ matchID });
        } catch (error) {
            console.error('Error while querying the database:', error);
        }
    }
}

async function parseMatches(matchData) {
    //const matchData = await getAllHubMatches();
    let team1 = [];
    let team2 = [];
    team1 = matchData.payload.teams[0].roster;
    team2 = matchData.payload.teams[1].roster;

    let fullRoster = team1.concat(team2);
    let nicknamesRaw = fullRoster.map((player) => player.nickname);
    let nicknames = nicknamesRaw.map((nickname) => nickname.toLowerCase());
    let matchID = matchData.payload.id;

    return { nicknames, matchID };
}

async function FaceitGet(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data; // Return the JSON data
    } catch (error) {
        console.error('Error: ', error);
        return null;
    }
}

async function getAllHubMatches() {
    let url =
        'https://open.faceit.com/data/v4/hubs/80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12/matches?offset=0&limit=100000';

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        //console.log(data.items[0].teams.faction1.roster);
        //console.log(data.items[0].results);
        return data; // Return the JSON data
    } catch (error) {
        console.error('Error: ', error);
        return null;
    }
}

async function getHub() {
    let url =
        'https://open.faceit.com/data/v4/hubs/80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12?expanded=game';

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data; // Return the JSON data
    } catch (error) {
        console.error('Error: ', error);
        return null;
    }
}

module.exports = {
    parseMatches,
    findUser,
    rewardParticipants,
    setClient,
    getHub,
    getAllHubMatches,
};
