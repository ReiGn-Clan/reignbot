const { config_to_use } = require('../../general_config.json');
const { timersDBEnv } = require(`../../${config_to_use}`);
const mongo_bongo = require('../utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(timersDBEnv);

async function bumpTimer(goal, channel, restart = false) {
    /*
    goal: time in ms when the timer should end
    */
    const collection = db.collection('timers');

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
    const collection = db.collection('timers');

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
    const collection = db.collection('timers');

    const documents = await collection.find({}).toArray();

    documents.forEach(async function (doc) {
        switch (doc.type) {
            case 'bump': {
                //Get the channel
                console.log('Found bump timer');
                const channel = await client.channels.fetch(doc.channelId);
                await bumpTimer(doc.goal, channel, true);
                break;
            }

            case 'vote': {
                console.log('Found vote timer');
                const channel = await client.channels.fetch(doc.channelId);
                const member = await guild.members.fetch(doc.userId);
                await voteTimer(doc.goal, channel, member, true);
                break;
            }
        }
    });
}

module.exports = { bumpTimer, voteTimer, restartTimers };
