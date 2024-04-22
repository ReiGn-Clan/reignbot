// Better version of dicord XP shit
const mongo_bongo = require('./mongo_bongo.js');
const fs = require('node:fs');
const levelNamesData = JSON.parse(
    fs.readFileSync('./json/levelNames.json', 'utf-8'),
);
const EventEmitter = require('events');

let collection;

const XP_EVENTS = new EventEmitter();

function set_collection(database_name, collection_name) {
    if (!database_name)
        throw new TypeError('An database_name was not provided.');
    if (!collection_name)
        throw new TypeError('A collection_name was not provided.');

    const db = mongo_bongo.getDbInstance(database_name);

    collection = db.collection(collection_name);
}

async function set_initial_rank(userId, guildId, disClient) {
    if (!userId) throw new TypeError('An user id was not provided.');
    if (!guildId) throw new TypeError('A guild id was not provided.');

    const user = await collection.findOne({ userID: userId, guildID: guildId });
    const guild = await disClient.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);

    if (!user) {
        const role_to_give = await guild.roles.cache.find(
            (role) => role.name === 'Neophyte',
        );

        await member.roles.add(role_to_give);

        const doc = {
            userID: userId,
            guildID: guildId,
            xp: 0,
            level: 0,
            rank: 'Neophyte',
            rankValue: 0,
            lastUpdated: new Date(),
        };

        await collection
            .insertOne(doc)
            .catch((e) => console.log(`Failed to save new user, error`, e));
    } else {
        const actual_rank = await getRank(userId, guildId);

        const role = await guild.roles.cache.find(
            (role) => role.name === actual_rank,
        );

        if (actual_rank === 'Neophyte') {
            await member.roles.add(role);
            return;
        }

        const previousRole = await guild.roles.cache.find(
            (role) => role.name === 'Neophyte',
        );

        await member.roles.remove(previousRole);
        await member.roles.add(role);
    }
}

async function appendXp(userId, guildId, xp) {
    /*
    Appends XP to a user (tokens in reign)

    Returns true for increase in level
    */

    if (!userId) throw new TypeError('An user id was not provided.');
    if (!guildId) throw new TypeError('A guild id was not provided.');
    if (xp == 0 || !xp || isNaN(parseInt(xp)))
        throw new TypeError('An amount of xp was not provided/was invalid.');

    const user = await collection.findOne({ userID: userId, guildID: guildId });

    if (!user) {
        const doc = {
            userID: userId,
            guildID: guildId,
            xp: parseInt(xp, 10),
            level: Math.floor(0.1 * Math.sqrt(xp)),
            lastUpdated: new Date(),
        };

        await collection
            .insertOne(doc)
            .catch((e) => console.log(`Failed to save new user, error`, e));

        return Math.floor(0.1 * Math.sqrt(xp)) > 0;
    }
    const prev_level = user.level;

    user.xp += parseInt(xp, 10);
    user.level = Math.floor(0.1 * Math.sqrt(user.xp));
    user.lastUpdated = new Date();

    await collection
        .updateOne({ _id: user._id }, { $set: user })
        .catch((e) => console.log(`Failed to append xp, error`, e));

    XP_EVENTS.emit('XPChanged');

    return prev_level < user.level;
}

async function subtractXp(userId, guildId, xp, rankName) {
    /*
    Subtracts XP from a user (tokens in reign)

    Returns true for decrease in level
    */
    if (!userId) throw new TypeError('An user id was not provided.');
    if (!guildId) throw new TypeError('A guild id was not provided.');
    if (xp == 0 || !xp || isNaN(parseInt(xp)))
        throw new TypeError('An amount of xp was not provided/was invalid.');

    const user = await collection.findOne({ userID: userId, guildID: guildId });

    if (!user) return false;

    const prev_level = user.level;

    if (user.xp - xp < 1) {
        user.xp = 1;
    } else {
        user.xp -= xp;
    }
    user.level = Math.floor(0.1 * Math.sqrt(user.xp));
    user.lastUpdated = new Date();
    if (rankName) {
        user.rank = rankName;
        user.rankValue = levelNamesData.names.indexOf(rankName);
    }

    await collection
        .updateOne({ _id: user._id }, { $set: user })
        .catch((e) => console.log(`Failed to subtract xp, error`, e));

    XP_EVENTS.emit('XPChanged');

    return prev_level > user.level;
}

async function setXp(userId, guildId, xp) {
    /*
    Sets XP of a user (tokens in reign)

    Returns true for increase in level
    */
    if (!userId) throw new TypeError('An user id was not provided.');
    if (!guildId) throw new TypeError('A guild id was not provided.');
    if (xp == 0 || !xp || isNaN(parseInt(xp)))
        throw new TypeError('An amount of xp was not provided/was invalid.');

    const user = await collection.findOne({ userID: userId, guildID: guildId });

    if (!user) return false;

    const prev_level = user.level;

    user.xp = parseInt(xp, 10);
    user.level = Math.floor(0.1 * Math.sqrt(user.xp));
    user.lastUpdated = new Date();

    await collection
        .updateOne({ _id: user._id }, { $set: user })
        .catch((e) => console.log(`Failed to append xp, error`, e));

    XP_EVENTS.emit('XPChanged');

    return prev_level > user.xp;
}

async function fetch(userId, guildId) {
    /*
    Retrieves the document for a user

    returns user doc
    */
    const user = await collection.findOne({ userID: userId, guildID: guildId });

    if (!user) return false;

    return user;
}

function xpFor(targetLevel) {
    if (isNaN(targetLevel) || isNaN(parseInt(targetLevel, 10)))
        throw new TypeError('Target level should be a valid number.');

    if (isNaN(targetLevel)) targetLevel = parseInt(targetLevel, 10);

    if (targetLevel < 0)
        throw new RangeError('Target level should be a positive number.');

    return targetLevel * targetLevel * 100;
}

async function getRank(userId, guildId) {
    if (!userId) throw new TypeError('An user id was not provided.');
    if (!guildId) throw new TypeError('A guild id was not provided.');

    const user = await collection.findOne({ userID: userId, guildID: guildId });

    return user.rank;
}

module.exports = {
    set_collection,
    appendXp,
    subtractXp,
    fetch,
    setXp,
    xpFor,
    getRank,
    set_initial_rank,
    XP_EVENTS,
};
