const Levels = require('../utils/syb_xp.js');
const { config_to_use } = require('../../general_config.json');
const { voiceRewardsEnv } = require(`../../${config_to_use}`);
const mongo_bongo = require('../utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(voiceRewardsEnv);
const xp_roles = require('../modules/xp_roles.js');
const token_rates = require('../../token_rates.json');

async function voiceStateHandler(oldMember, newMember, afk_channel) {
    if (newMember.member.user.bot) {
        console.log('Bot Detected');
        return;
    }

    const newUserChannel = newMember.channel;
    const oldUserChannel = oldMember.channel;

    const newDeafened = newMember.deaf;
    const newMuted = newMember.mute;
    const oldCam = oldMember.selfVideo;
    const newCam = newMember.selfVideo;

    if (oldUserChannel === null && newUserChannel !== null) {
        // User Joins a voice channel

        // Check if channel is not afk
        if (newUserChannel.id == afk_channel) return;
        if (newDeafened || newMuted) return;
        console.log('User joined');
        await user_join(newMember, newUserChannel);
        return;
    } else if (newUserChannel === null) {
        // User leaves a voice channel
        if (oldUserChannel.id == afk_channel) return;
        console.log('User left');
        await user_leave(newMember, oldUserChannel);
        return;
    } else if (
        oldUserChannel != newUserChannel &&
        newUserChannel !== null &&
        oldUserChannel !== null
    ) {
        // User switches to a different channel
        // Check if channel is not afk
        console.log('User switched');
        if (newUserChannel.id == afk_channel) return;
        await user_switch(newMember, oldUserChannel, newUserChannel);
        return;
    }

    // Check if cam is on / off
    if (newCam && !oldCam) {
        // cam Enabled
        console.log('User cam on');
        await cam_on(newMember, newUserChannel);
        return;
    } else if (!newCam && oldCam) {
        // cam Disabled
        console.log('User cam off');
        await cam_off(newMember, newUserChannel);
        return;
    }

    // Check if is muted or not
    if (newDeafened || newMuted) {
        // Basically remove from channel
        console.log('User muted');
        await user_leave(newMember, newUserChannel);
        return;
    } else {
        // Basically add back to channel
        console.log('User unmuted');
        if (newUserChannel !== null) {
            if (newUserChannel.id == afk_channel) return;
            await user_join(newMember, newUserChannel);
            return;
        }
    }
}

async function user_join(user, channel) {
    const collection = db.collection('channels');
    const userId = user.id;
    const channelId = channel.id;

    const channel_info = await collection.findOne({ channelId: channelId });

    if (channel_info == (undefined || null)) {
        collection.insertOne({
            channelId: channelId,
            users: [{ userId: userId, cam: user.selfVideo }],
        });

        return;
    }

    channel_info.users.push({ userId: userId, cam: user.selfVideo });
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

    if (channel_info == (undefined || null)) return;

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

async function cam_on(user, channel) {
    const userId = user.id;
    const channelId = channel.id;

    const collection = db.collection('channels');
    const channel_info = await collection.findOne({ channelId: channelId });

    if (channel_info == (undefined || null)) return;

    const searchIndex = channel_info.users.findIndex(
        (user) => user.userId == userId,
    );

    // Change status to on
    channel_info.users[searchIndex].cam = true;

    await collection.updateOne(
        { _id: channel_info._id },
        { $set: channel_info },
    );
}

async function cam_off(user, channel) {
    const userId = user.id;
    const channelId = channel.id;

    const collection = db.collection('channels');
    const channel_info = await collection.findOne({ channelId: channelId });

    if (channel_info == (undefined || null)) return;

    const searchIndex = channel_info.users.findIndex(
        (user) => user.userId == userId,
    );

    // Change status to on
    channel_info.users[searchIndex].cam = false;

    await collection.updateOne(
        { _id: channel_info._id },
        { $set: channel_info },
    );
}

async function reward_users(guild, disClient) {
    const collection = db.collection('channels');
    const array_collection = await collection.find({}).toArray();

    array_collection.map(async (channel) => {
        if (channel.users.length <= 1) return;

        const flat_rate = token_rates.voiceFlatRate;
        const multiplier = 0.8 + channel.users.length * 0.1;
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

async function bot_boot(guild) {
    const collection = db.collection('channels');
    // Upon booting wipe collection docs
    await collection.deleteMany({});

    // Loop over channels and get what users are in it
    const voiceChannels = guild.channels.cache.filter((channel) =>
        channel.isVoiceBased(),
    );

    voiceChannels.forEach((channel) => {
        channel.members.map((user) => {
            user.voice.deaf;

            if (!user.voice.deaf && !user.voice.mute)
                user_join(user.voice, channel);
        });
    });
}

module.exports = {
    user_join,
    user_leave,
    user_switch,
    reward_users,
    cam_on,
    cam_off,
    voiceStateHandler,
    bot_boot,
};
