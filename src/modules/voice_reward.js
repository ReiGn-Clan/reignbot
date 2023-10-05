const Levels = require('../utils/syb_xp.js');
const { config_to_use } = require('../../general_config.json');
const { voiceRewardsEnv } = require(`../../${config_to_use}`);
const mongo_bongo = require('../utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(voiceRewardsEnv);
const xp_roles = require('xp_roles.js');

async function user_join(user, channel) {
    const collection = db.collection('channels');
    const userId = user.id;
    const channelId = channel.id;

    const channel_info = await collection.findOne({ channelId: channelId });

    if (channel_info == (undefined || null)) {
        collection.insertOne({
            channelId: channelId,
            users: { userId: userId, cam: false },
        });

        return;
    }

    channel_info.users.push({ userId: userId, cam: false });
    await collection.updateOne(
        { _id: channel_info._id },
        { $set: channel_info },
    );

    return;
}

async function user_leave(user, channel) {
    const collection = db.collection('channels');
    const userId = user.id;
    const channelId = channel.id;

    const channel_info = await collection.findOne({ channelId: channelId });

    const searchIndex = channel_info.users.findIndex(
        (user) => user.userId == userId,
    );

    channel_info.users.splice(searchIndex, 1);

    if (channel_info.users.length == 0) {
        await collection.deleteOne({ channelId: channelId });
    } else {
        await collection.updateOne(
            { _id: channel_info._id },
            { $set: channel_info },
        );
    }
}

async function user_switch(user, oldChannel, newChannel) {
    await user_leave(user, oldChannel);
    await user_join(user, newChannel);
}

async function reward_users(guild, disClient) {
    const collection = db.collection('channels');
    const array_collection = collection.toArray();

    array_collection.map(async (channel) => {
        const flat_rate = 10;
        const multiplier = 0.9 + channel.users.length * 0.1;
        let tokens = flat_rate * multiplier;

        channel.users.map(async (user) => {
            if (user.cam) {
                tokens + 5;
            }

            let hasLeveledUp = await Levels.appendXp(
                user.userId,
                guild.id,
                tokens,
            ).catch(console.error); // add error handling for appendXp function

            if (hasLeveledUp) {
                try {
                    await xp_roles.improvedLevelUp(
                        guild,
                        user.userId,
                        disClient,
                    );
                } catch (error) {
                    console.error(error); // add error handling for levelUp functio
                }
            }
        });
    });
}

module.exports = {
    user_join,
    user_leave,
    user_switch,
    reward_users,
};
