const fs = require('node:fs');
const Levels = require('discord-xp');
const { EmbedBuilder } = require('discord.js');

const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8');
const levelRanges = JSON.parse(levelNamesData).ranges;

const { MongoClient } = require('mongodb');
const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/xpDatabase`;
const client = new MongoClient(uri);
const db = client.db('xpDatabase');

async function improvedLevelUpMessage(message, disClient) {
    // What role should the user
    let user = await Levels.fetch(message.author.id, message.guild.id);
    const member = await message.guild.members.fetch(message.author.id);

    let newLevelRange = levelRanges.find(
        (range) => range.start <= user.level && range.end >= user.level,
    );
    let newLevelName = newLevelRange ? newLevelRange.value : null;

    // Find what level the user currently has
    let current_roles = member._roles;
    let role_array = [];
    // Check if it has one of the roles
    for (let i in levelRanges) {
        role_array.push(levelRanges[i].value);
    }

    const channelID = '1103780086810955846';
    const channel = await disClient.channels.fetch(channelID);

    const channelID2 = '1091539145127641098';
    const channel2 = await disClient.channels.fetch(channelID2);

    // Loop over current roles
    for (let i in current_roles) {
        let name = (await message.guild.roles.fetch(current_roles[i])).name;

        if (role_array.includes(name)) {
            console.log('Found', name);
            if (name === newLevelName) {
                // Nothing has to be done
                console.log('No Action needed');
                channel.send(
                    `${message.author}, congratulations! You've leveled up to **Level ${user.level}!**`,
                );
                return;
            } else {
                console.log('Removing old role and adding new');
                const role = await message.guild.roles.cache.find(
                    (role) => role.name === newLevelName,
                );
                const previousRole = await member.guild.roles.cache.find(
                    (role) => role.name === name,
                );

                await member.roles.remove(previousRole);
                await member.roles.add(role);

                await channel2.send(
                    `${message.author}, congratulations! You've leveled up to **Level ${user.level}** and have been awarded the rank **${role.name}!**`,
                );

                return;
            }
        }
    }
    // if we come to this it means that the user did not have a rank role, which should not happen
    // but in case
    console.log('No role found wtf, adding it');
    const role = await message.guild.roles.cache.find(
        (role) => role.name === newLevelName,
    );
    await member.roles.add(role);

    await channel2.send(
        `${message.author}, congratulations! You've leveled up to **Level ${user.level}** and have been awarded the rank **${role.name}!**`,
    );
}

async function improvedLevelUp(guild, userID, disClient) {
    // What role should the user
    let user = await Levels.fetch(userID, guild.id);
    const member = await guild.members.fetch(userID);
    const channelID = '1103780086810955846';
    const channel = await disClient.channels.fetch(channelID);

    const channelID2 = '1091539145127641098';
    const channel2 = await disClient.channels.fetch(channelID2);

    let newLevelRange = levelRanges.find(
        (range) => range.start <= user.level && range.end >= user.level,
    );
    let newLevelName = newLevelRange ? newLevelRange.value : null;

    // Find what level the user currently has
    let current_roles = member._roles;
    let role_array = [];
    // Check if it has one of the roles
    for (let i in levelRanges) {
        role_array.push(levelRanges[i].value);
    }

    console.log(newLevelName);
    // Loop over current roles
    for (let i in current_roles) {
        let name = (await guild.roles.fetch(current_roles[i])).name;

        if (role_array.includes(name)) {
            console.log('Found', name);
            if (name === newLevelName) {
                // Nothing has to be done
                channel.send(
                    `${member.user}, congratulations! You've leveled up to **Level ${user.level}!**`,
                );
                console.log('No Action needed');
                return;
            } else {
                console.log('Removing old role and adding new');
                const role = await guild.roles.cache.find(
                    (role) => role.name === newLevelName,
                );

                const previousRole = await member.guild.roles.cache.find(
                    (role) => role.name === name,
                );

                await member.roles.remove(previousRole);
                await member.roles.add(role);
                channel2.send(
                    `${member.user}, congratulations! You've leveled up to **Level ${user.level}** and have been awarded the rank **${role.name}!**`,
                );
                return;
            }
        }
    }
    // if we come to this it means that the user did not have a rank role, which should not happen
    // but in case
    console.log('No role found wtf, adding it');
    const role = await guild.roles.cache.find(
        (role) => role.name === newLevelName,
    );
    await member.roles.add(role);
    channel2.send(
        `${member.user}, congratulations! You've leveled up to **Level ${user.level}** and have been awarded the rank **${role.name}!**`,
    );
}

async function updateXpLeaderboard(guildID, disClient) {
    const guild = await disClient.guilds.fetch(guildID);

    const emote_dict = {
        SAME: '⛔',
        UP: '⬆️',
        DOWN: '⬇️',
        NEW: '🆕',
    };

    const limit = 10000;
    let all_members = await guild.members.fetch();

    all_members.forEach(function (item, key) {
        if (item.user.bot) {
            all_members.delete(key);
        }
    });

    const all_memberIDs = Array.from(all_members.keys());
    const timestamp = new Date().toLocaleString();
    const xp_leaderboard = await db.collection('levels');
    const old_leaderboard = await db.collection('oldLevels');

    const sorted_leaderboard_old = await old_leaderboard
        .aggregate([
            {
                $match: {
                    userID: { $in: all_memberIDs },
                },
            },
            {
                $sort: { xp: -1 },
            },
            {
                $limit: limit,
            },
        ])
        .toArray();

    const sorted_leaderboard = await xp_leaderboard
        .aggregate([
            {
                $match: {
                    userID: { $in: all_memberIDs },
                },
            },
            {
                $sort: { xp: -1 },
            },
            {
                $limit: limit,
            },
        ])
        .toArray();

    const updatedLeaderboard = await positionChange(
        sorted_leaderboard_old,
        sorted_leaderboard,
    );

    const memberPromises = updatedLeaderboard.map(async (user, index) => {
        const member = await guild.members.fetch(user.userID);
        return [
            `${index + 1}. ${member.nickname ?? member.user.username}`,
            `Level ${user.level} (${user.xp} XP)`,
            `${emote_dict[user.change]}`,
        ];
    });

    const leaderboardData = (await Promise.all(memberPromises)).filter(
        (entry) => entry !== undefined || null,
    );

    const fields = [
        {
            name: 'User',
            value: leaderboardData.map((entry) => entry[0]).join('\n'),
            inline: true,
        },
        {
            name: 'XP',
            value: leaderboardData.map((entry) => entry[1]).join('\n'),
            inline: true,
        },
        {
            name: 'Change',
            value: leaderboardData.map((entry) => entry[2]).join('\n'),
            inline: true,
        },
    ];

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Top Members')
        .setDescription(
            `Here are the top members by XP in this server: \n Changes are from the last minute only \n Last update: ${timestamp}`,
        )
        .addFields(fields);

    const channel = await guild.channels.fetch('1095411283882426488');
    const message = await channel.messages.fetch('1098278074254110740');

    message
        .edit({ embeds: [embed] })
        .then(console.log('Updated XP leaderboard'))
        .catch(console.error);

    await old_leaderboard.deleteMany();
    await old_leaderboard.insertMany(await xp_leaderboard.find({}).toArray());
}

async function rewardVoiceUsers(guildID, voiceChannelUsers, disClient) {
    const guild = await disClient.guilds.fetch(guildID);

    const xpPerMinute = 10;
    console.log('Updating xp for users', voiceChannelUsers);
    voiceChannelUsers.forEach(async function (item) {
        let hasLeveledUp = await Levels.appendXp(
            item,
            guild.id,
            xpPerMinute,
        ).catch(console.error); // add error handling for appendXp function

        if (hasLeveledUp) {
            try {
                await improvedLevelUp(guild, item, disClient);
            } catch (error) {
                console.error(error); // add error handling for levelUp functio
            }
        }

        console.log('Done for user', item);
    });
}

async function positionChange(oldLeaderboard, newLeaderboard) {
    const updatedLeaderboard = newLeaderboard.map((doc, index) => {
        const oldIndex = oldLeaderboard.findIndex(
            (oldDoc) => oldDoc.userID === doc.userID,
        );
        if (oldIndex === -1) {
            doc.change = 'NEW';
        } else if (oldIndex === index) {
            doc.change = 'SAME';
        } else if (oldIndex < index) {
            doc.change = 'DOWN';
        } else {
            doc.change = 'UP';
        }
        return doc;
    });

    return updatedLeaderboard;
}

async function makeDaily(disClient, manual = false, manualXP, manualUses) {
    // Determine if we want to make a daily (chance 1 in 5)
    if (!manual) {
        if (Math.floor(Math.random() * 5) !== 4) return;
    }

    // Channel to send it in
    const channelID = '1091539145127641098';
    const channel = await disClient.channels.fetch(channelID);
    const dailies = await db.collection('dailies');

    if (!manual) {
        const lastMessage = (
            await channel.messages.fetch({ limit: 1 })
        ).first();
        if (lastMessage.author.bot) return;
    }

    let maxReactions = Math.floor(Math.random() * 5) + 1;
    let xp = (Math.floor(Math.random() * 25) + 1) * 100;
    if (manual) {
        maxReactions = manualUses;
        xp = manualXP;
    }

    // Sending the message
    channel
        .send({
            content: `React to this message to gain **${xp}** xp \n This message has max ${maxReactions} uses \n **${maxReactions}** uses left`,
            fetchReply: true,
        })
        .then(async (sent) => {
            sent.react('1099386036133560391');
            let id_ = sent.id;
            console.log(id_);
            const doc = {
                _id: id_,
                maxUses: maxReactions,
                uses: 0,
                xp: xp,
                channelID: channelID,
                users: [],
            };
            await dailies.insertOne(doc);
        });
}

async function rewardDaily(reaction, user, disClient) {
    // Avoid the bot reaction
    if (user.id == '1089665817160978553') return;

    const dailies = await db.collection('dailies');
    let messageDOC = await dailies.findOne({ _id: reaction.message.id });
    const guild = await disClient.guilds.fetch(reaction.message.guildId);

    if (reaction.emoji.id !== '1099386036133560391') {
        console.log('Wrong emoji');
        await reaction.users.remove(user.id);
        return;
    }

    if (messageDOC !== null) {
        if (messageDOC.users.includes(user.id)) return;
        // Channel and message that is the daily
        const channelDaily = await disClient.channels.fetch(
            messageDOC.channelID,
        );
        const messageDaily = await channelDaily.messages.fetch(messageDOC._id);
        if (
            (messageDOC.uses + 1 == messageDOC.maxUses) |
            (messageDOC.uses >= messageDOC.maxUses)
        ) {
            await dailies.deleteOne({ _id: reaction.message.id });

            messageDaily.delete().catch(console.error);
        } else {
            messageDOC.users.push(user.id);
            await dailies.updateOne(
                { _id: reaction.message.id },
                { $inc: { uses: 1 }, $set: { users: messageDOC.users } },
            );
            messageDaily.edit({
                content: `React to this message to gain **${
                    messageDOC.xp
                }** xp \n This message has max ${
                    messageDOC.maxUses
                } uses \n **${
                    messageDOC.maxUses - messageDOC.uses - 1
                }** uses left`,
            });
        }

        let hasLeveledUp = await Levels.appendXp(
            user.id,
            reaction.message.guildId,
            messageDOC.xp,
        ).catch(console.error); // add error handling for appendXp function

        // Let user know they earned xp
        const channelID = '1103780086810955846';
        const channel = await disClient.channels.fetch(channelID);

        channel.send({
            content: `${user} has earned **${messageDOC.xp}** xp with a pop-up!`,
        });

        if (hasLeveledUp) {
            try {
                await improvedLevelUp(guild, user.id, disClient);
            } catch (error) {
                console.error(error); // add error handling for levelUp functio
            }
        }
    }
}

module.exports = {
    updateXpLeaderboard,
    improvedLevelUp,
    improvedLevelUpMessage,
    rewardVoiceUsers,
    makeDaily,
    rewardDaily,
};
