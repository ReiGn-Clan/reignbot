const { config_to_use } = require('../../general_config.json');
const { timersDbEnv } = require(`../../${config_to_use}`);
const mongo_bongo = require('../utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(timersDbEnv);

const collection = db.collection('timers');

async function bumpTimer(goal, channel, restart = false) {
    /*
    goal: time in ms when the timer should end
    */

    if (!restart) {
        await collection.insertOne({
            goal: goal,
            type: 'bump',
            channelId: channel.id,
        });
    }
    const remaining_time = goal - Date.now();

    setTimeout(() => {
        const roleID = '1124800405189185536';
        channel.send({
            content: `### <@&${roleID}> It's time to bump again squad! ❤️`,
        });

        collection.deleteOne({ goal: goal });
    }, remaining_time);
}

async function voteTimer(goal, channel, member, restart = false) {
    /*
    goal: time in ms when the timer should end
    */

    if (!restart) {
        await collection.insertOne({
            goal: goal,
            type: 'vote',
            channelId: channel.id,
            userId: member.user.id,
        });
    }
    const remaining_time = goal - Date.now();

    setTimeout(() => {
        channel.send({
            content: `${member.user} It's time to vote again on https://top.gg/servers/1089665371923026053 !`,
        });

        collection.deleteOne({ goal: goal });
    }, remaining_time);
}

async function restartTimers(guild, client) {
    /*
    Go through the timer collection and retrieve all the timers
    */

    const documents = await collection.find({}).toArray();

    documents.array.forEach(async function (doc) {
        switch (doc.type) {
            case 'bump': {
                //Get the channel
                const channel = await client.channels.fetch(doc.channelId);
                await bumpTimer(doc.goal, channel, true);
                break;
            }

            case 'vote': {
                const channel = await client.channels.fetch(doc.channelId);
                const member = await guild.members.fetch(doc.userId);
                await voteTimer(doc.goal, channel, member, true);
                break;
            }
        }
    });
}

module.exports = { bumpTimer, voteTimer, restartTimers };
