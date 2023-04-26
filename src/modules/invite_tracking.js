const { MongoClient } = require('mongodb');
// Replace the uri string with your MongoDB deployment's connection string.
const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/recruiter`;
const client = new MongoClient(uri);
const db = client.db('recruiter');
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

async function CreateInviteLinkObject(invites, invite_links) {
    // Get the keys == invite link
    const keys = invites.keys();
    // Loop over the links and save " link : [creator, times used]"

    // eslint-disable-next-line no-constant-condition
    while (1) {
        const curr_key = keys.next();
        if (curr_key.done == true) break;

        let doc = {
            _id: curr_key.value,
            InviterID: invites.get(curr_key.value).inviterId,
            LinkUses: invites.get(curr_key.value).uses,
            ExpirationDate: invites.get(curr_key.value).expiresAt,
            MaximumUses: invites.get(curr_key.value).maxUses,
        };

        let exist = await invite_links.findOne({ _id: curr_key.value });

        if (exist === null) {
            invite_links.insertOne(doc);
        } else {
            delete doc._id;

            invite_links.updateOne({ _id: curr_key.value }, { $set: doc });
        }
    }
}

// Function to update the list of existing invites,
async function UpdateLinks(invites) {
    const invite_links = db.collection('invite_links');
    await CreateInviteLinkObject(invites, invite_links);
}

// Update the leaderboard file, not sorted (yet)
async function UpdateLeaderboard(invites, memberID, guild, increase = true) {
    // Read in file

    const invite_links = db.collection('invite_links');
    const invite_leaderboard = db.collection('invite_leaderboard');
    const what_links = db.collection('what_links');

    let sorted_array_old = await invite_leaderboard
        .aggregate([
            {
                $sort: { score: -1 },
            },
        ])
        .toArray();

    let link_used;
    //let what_links = {};

    // Retrieve the link
    if (increase) {
        link_used = await RetrieveLinkUsed(invites, invite_links);
        if (link_used === 0) return;
    } else {
        link_used = (await what_links.findOne({ _id: memberID })).link;
        console.log(link_used);
    }

    console.log(link_used);

    // Update the leaderboard and save it, if the link is not undefined
    if (link_used != null) {
        const userID =
            'u' + (await invite_links.findOne({ _id: link_used })).InviterID;
        //const userID = 'u' + invite_links[link_used].InviterID;

        const exist = await invite_leaderboard.findOne({ _id: userID });
        console.log(exist);
        if (exist != null) {
            console.log('Yeet');
            if (increase) {
                await invite_leaderboard.updateOne(
                    { _id: userID },
                    { $inc: { score: 1 } },
                );

                let doc = { _id: memberID, link: link_used };
                await what_links.insertOne(doc);
            } else {
                await invite_leaderboard.updateOne(
                    { _id: userID },
                    { $inc: { score: -1 } },
                );

                await what_links.deleteOne({ _id: memberID });

                let score = (await invite_leaderboard.findOne({ _id: userID }))
                    .score;

                console.log('SCORE', score);
                if (score === 0)
                    await invite_leaderboard.deleteOne({ _id: userID });
            }
        } else {
            let doc = { _id: memberID, link: link_used };
            await what_links.insertOne(doc);

            //what_links[memberID] = link_used;

            doc = {
                _id: userID,
                score: 1,
                change: 'NEW',
            };
            await invite_leaderboard.insertOne(doc);
        }

        // Sort the leaderboard top to low and save
        let sorted_array = await invite_leaderboard
            .aggregate([
                {
                    $sort: { score: -1 },
                },
            ])
            .toArray();

        console.log('NEW:', sorted_array);

        console.log('OLD:', sorted_array_old);

        const updatedLeaderboard = sorted_array.map((doc, index) => {
            const oldIndex = sorted_array_old.findIndex(
                (oldDoc) => oldDoc._id === doc._id,
            );
            if (oldIndex === -1) {
                doc.change = 'NEW';
            } else if (oldIndex === index) {
                doc.change = 'SAME';
            } else if (oldIndex < index) {
                doc.change = 'UP';
            } else {
                doc.change = 'DOWN';
            }
            return doc;
        });

        console.log(updatedLeaderboard);

        await invite_leaderboard.deleteMany({});

        if (updatedLeaderboard.length > 0) {
            await invite_leaderboard.insertMany(updatedLeaderboard);
        }
        update_dynamic_Leaderboards(updatedLeaderboard, guild).then(
            console.log('Leaderboards Updated!'),
        );
    }
}

async function RetrieveLinkUsed(invites, invite_links_old) {
    const temp_invite_links = db.collection('temp_invite_links');
    let link_used = null;

    // Retrieve the current existing links
    await CreateInviteLinkObject(invites, temp_invite_links);

    let intersected = await invite_links_old
        .aggregate([
            {
                $lookup: {
                    from: 'temp_invite_links',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'temp',
                },
            },
            {
                $match: {
                    temp: { $not: { $size: 0 } }, // filter out documents without a matching document in temp_invite_links
                    $expr: {
                        $ne: [
                            { $arrayElemAt: ['$temp.LinkUses', 0] },
                            '$LinkUses',
                        ],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                },
            },
        ])
        .toArray();

    if (intersected.length > 0) {
        link_used = intersected[0]._id;
    }

    if (link_used === null) {
        // Check what links are in old but not new
        // Filter out the links that have reached their maximum uses
        // Filter out the links that have expired
        let difference = await invite_links_old
            .aggregate([
                {
                    $lookup: {
                        from: 'temp_invite_links',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'temp',
                    },
                },
                {
                    $match: {
                        temp: { $size: 0 }, // filter out documents with no matching documents in temp_invite_links
                    },
                },
                {
                    $match: {
                        $expr: {
                            $ne: ['$LinkUses', '$MaximumUses'], // filter out documents where LinkUses equals MaximumUses
                        },
                    },
                },
                {
                    $match: {
                        $expr: {
                            $lt: [Date.parse('$ExpirationDate'), Date.now()], // filter out documents where ExpirationDate has passed
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                    },
                },
            ])
            .toArray();

        if (difference.length > 0) {
            link_used = intersected[0]._id;
        }

        // Increase the link uses
        await invite_links_old.updateOne(
            { _id: link_used },
            { $inc: { LinkUses: 1 } },
        );
    }

    if (link_used != null) {
        await temp_invite_links.deleteMany({});
        return link_used;
    } else {
        await temp_invite_links.deleteMany({});
        console.log('User didnt join with a link, most likely bot');
        return 0;
    }
}

async function update_dynamic_Leaderboards(leaderboard, guild) {
    const emote_dict = {
        SAME: '⛔',
        UP: '⬆️',
        DOWN: '⬇️',
        NEW: '🆕',
    };

    const invite_leaderboard = leaderboard;

    if (invite_leaderboard.length === 0) {
        console.log('No entries on leaderboard yet');
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Invite Leaderboard')
            .setDescription('There is nobody on the leaderboard yet!');
        await loop_leaderboards(embed, guild);
        return;
    }

    const all_members = await guild.members.fetch();
    const all_memberIDs = Array.from(all_members.keys());
    let unknown_members = 0;

    const memberPromises = leaderboard.map(async (user, index) => {
        try {
            if (all_memberIDs.includes(String(user._id).substring(1))) {
                const member = await guild.members.fetch(
                    String(user._id).substring(1),
                );
                return `${index + 1 - unknown_members}. ${
                    member.nickname ?? member.user.username
                } - ${user.score} - ${emote_dict[user.change]}`;
            } else {
                unknown_members += 1;
            }
        } catch (error) {
            console.error(`Error fetching member ${user.userID}`, error);
            return null;
        }
    });

    const leaderboardData = (await Promise.all(memberPromises)).filter(
        (entry) => entry !== undefined || null,
    );

    const fields = [
        {
            name: 'User',
            value: leaderboardData
                .map((entry) => entry.split(' - ')[0])
                .join('\n'),
            inline: true,
        },
        {
            name: 'Recruited',
            value: leaderboardData
                .map((entry) => entry.split(' - ')[1])
                .join('\n'),
            inline: true,
        },
        {
            name: 'Change',
            value: leaderboardData
                .map((entry) => entry.split(' - ')[2])
                .join('\n'),
            inline: true,
        },
    ];

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Invite Leaderboard')
        .setDescription('Here are the top recruiters in this server:')
        .addFields(fields);

    await loop_leaderboards(embed, guild);
}

async function loop_leaderboards(embed, guild) {
    const dyn_boards = JSON.parse(
        fs.readFileSync('./json/dynamic_leaderboards.json'),
    );
    let dyn_names = Object.keys(dyn_boards);
    for (let i in dyn_names) {
        let board = dyn_boards[dyn_names[i]];

        const channel = await guild.channels.fetch(board.channel);

        const message = await channel.messages.fetch(board.message);

        message
            .edit({ embeds: [embed] })
            .then(console.log('Updated dynamic leaderboard:' + dyn_names[i]))
            .catch(console.error);
    }
}

module.exports = { UpdateLinks, UpdateLeaderboard, RetrieveLinkUsed };
