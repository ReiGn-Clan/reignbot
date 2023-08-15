const Levels = require('../utils/syb_xp.js');
const { EmbedBuilder } = require('discord.js');
const { config_to_use } = require('../../general_config.json');
const {
    variousIDs,
    discordAPIBotStuff,
    xpDbEnvironment,
} = require(`../../${config_to_use}`);
const mongo_bongo = require('../utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(xpDbEnvironment);

async function improvedLevelUpMessage(message, disClient) {
    // What role should the user
    let user = await Levels.fetch(message.author.id, message.guild.id);
    const member = await message.guild.members.fetch(message.author.id);

    if (member.user.bot) {
        console.log('Bot trying to lvl up');
        return;
    }

    const channel = await disClient.channels.fetch(
        variousIDs[0].userUpdatesChannel,
    );

    // Nothing has to be done
    console.log('No Action needed');
    channel.send(
        `${member.user}, congratulations! You've leveled up to **Level ${user.level}!**`,
    );
    return;
}

async function improvedLevelUp(
    guild,
    userID,
    disClient,
    deranking = false,
    gambling = false,
) {
    console.log(deranking, gambling);
    // What role should the user
    let user = await Levels.fetch(userID, guild.id);
    const member = await guild.members.fetch(userID);

    if (member.user.bot) {
        console.log('Bot trying to lvl up');
        return;
    }

    const channel = await disClient.channels.fetch(
        variousIDs[0].userUpdatesChannel,
    );

    if (!gambling) {
        if (!deranking) {
            // Nothing has to be done
            await channel.send(
                `${member.user}, congratulations! You've leveled up to **Level ${user.level}!**`,
            );
            console.log('No Action needed');
            return;
        } else {
            // Nothing has to be done
            await channel.send(
                `${member.user}, oh no! You've lost tokens and are now **Level ${user.level}!**`,
            );
            console.log('No Action needed');
            return;
        }
    } else {
        return;
    }
}

async function updateXpLeaderboard(guildID, disClient) {
    const guild = await disClient.guilds.fetch(guildID);

    const emote_dict = {
        SAME: '⛔',
        UP: '⬆️',
        DOWN: '⬇️',
        NEW: '🆕',
    };

    const limit = 50;
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
                $sort: { rankValue: -1, xp: -1 },
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
                $sort: { rankValue: -1, xp: -1 },
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
        if (typeof user.rank == 'undefined') {
            user.rank = 'Neophyte';
        }
        let tokens = user.xp;
        if (tokens > 100000000000) {
            tokens = '' + tokens;
            tokens = tokens.substring(0, tokens.length - 9) + 'B';
        } else if (tokens > 100000000) {
            tokens = '' + tokens;
            tokens = tokens.substring(0, tokens.length - 6) + 'M';
        }
        return [
            `${index + 1}:  ${member.nickname ?? member.user.username}`,
            `${user.rank}`,
            `${tokens} RT ${emote_dict[user.change]}`,
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
            name: 'Rank',
            value: leaderboardData.map((entry) => entry[1]).join('\n'),
            inline: true,
        },
        {
            name: 'RT Change',
            value: leaderboardData.map((entry) => entry[2]).join('\n'),
            inline: true,
        },
    ];

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Top Members')
        .setDescription(
            `Here are the top members by ReiGn Tokens in this server: \n Changes are from the last minute only \n Last update: ${timestamp}`,
        )
        .addFields(fields);

    const channel = await guild.channels.fetch(variousIDs[2].topMembersChannel);
    const message = await channel.messages.fetch(
        variousIDs[3].topMembersMessage,
    );

    message
        .edit({ embeds: [embed] })
        .then(console.log('Updated RT leaderboard'))
        .catch(console.error);

    await old_leaderboard.deleteMany();
    await old_leaderboard.insertMany(await xp_leaderboard.find({}).toArray());
}

async function rewardVoiceUsers(guildID, voiceChannelUsers, disClient) {
    const guild = await disClient.guilds.fetch(guildID);

    const xpPerMinute = 10;
    console.log('Updating RT for users', voiceChannelUsers);
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
    const channel = await disClient.channels.fetch(
        variousIDs[1].generalChannel,
    );

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
            content: `React to this message to gain **${xp}** ReiGn Tokens \n This message has max ${maxReactions} uses \n **${maxReactions}** uses left`,
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
                channelID: variousIDs[1].generalChannel,
                users: [],
            };
            await dailies.insertOne(doc);
        });
}

async function rewardDaily(reaction, user, disClient) {
    // Avoid the bot reaction
    if (user.id == discordAPIBotStuff[2].clientID) return;

    const dailies = await db.collection('dailies');
    let messageDOC = await dailies.findOne({ _id: reaction.message.id });
    const guild = await disClient.guilds.fetch(reaction.message.guildId);

    if (messageDOC !== null) {
        if (reaction.emoji.id !== '1099386036133560391') {
            console.log('Wrong emoji');
            await reaction.users.remove(user.id);
            return;
        }
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
                }** ReiGn Tokens \n This message has max ${
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
        const channel = await disClient.channels.fetch(
            variousIDs[0].userUpdatesChannel,
        );

        channel.send({
            content: `${user} has earned **${messageDOC.xp}** ReiGn Tokens with a pop-up!`,
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

async function rewardBoost(guildID, user, disClient) {
    const boostersCollection = db.collection('boosters');
    const channel = await disClient.channels.fetch(
        variousIDs[1].generalChannel,
    );

    const guild = await disClient.guilds.fetch(guildID);
    const alreadyBoosted = await boostersCollection.findOne({ user: user.id });

    if (alreadyBoosted) {
        return;
    }

    if (!alreadyBoosted) {
        let hasLeveledUp = await Levels.appendXp(user.id, guildID, 10000).catch(
            console.error,
        ); // add error handling for appendXp function

        channel.send({
            content: `${user} boosted the server and has been awarded 10,000 ReiGn Tokens!`,
        });
        await boostersCollection.insertOne({ user: user.id });
        if (hasLeveledUp) {
            try {
                await improvedLevelUp(guild, user.id, disClient);
            } catch (error) {
                console.error(error); // add error handling for levelUp functio
            }
        }
    }
}

async function rewardBump(message, disClient) {
    const tokens = 1500;
    const channel = await disClient.channels.fetch(
        variousIDs[0].userUpdatesChannel,
    );
    const user = message.interaction.user;
    const guild = await disClient.guilds.fetch(discordAPIBotStuff[1].guildID);

    channel.send({
        content: `${user} has earned **${tokens}** ReiGn Tokens by bumping the server`,
    });

    let hasLeveledUp = await Levels.appendXp(
        user.id,
        message.guildId,
        tokens,
    ).catch(console.error); // add error handling for appendXp function

    if (hasLeveledUp) {
        try {
            await improvedLevelUp(guild, user.id, disClient);
        } catch (error) {
            console.error(error); // add error handling for levelUp functio
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
    rewardBoost,
    rewardBump,
};
