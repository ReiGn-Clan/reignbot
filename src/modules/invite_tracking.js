const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

function CreateInviteLinkObject(invites, links) {
    // Get the keys == invite link
    const keys = invites.keys();
    // Loop over the links and save " link : [creator, times used]"
    // eslint-disable-next-line no-constant-condition
    while (1) {
        const curr_key = keys.next();
        if (curr_key.done == true) break;

        links[curr_key.value] = {
            InviterID: invites.get(curr_key.value).inviterId,
            LinkUses: invites.get(curr_key.value).uses,
            ExpirationDate: invites.get(curr_key.value).expiresAt,
            MaximumUses: invites.get(curr_key.value).maxUses,
        };
    }

    return links;
}

// Function to update the list of existing invites,
function UpdateLinks(invites) {
    // Create empty object
    let links = JSON.parse(fs.readFileSync('./json/invite_links.json'));

    links = CreateInviteLinkObject(invites, links);

    // Save the information to JSON file
    let json_data = JSON.stringify(links, null, 2);

    fs.writeFileSync('./json/invite_links.json', json_data, (err) => {
        if (err) throw err;
        console.log('Links written to file');
    });
}

// Update the leaderboard file, not sorted (yet)
function UpdateLeaderboard(invites, memberID, guild, increase = true) {
    // Read in file
    let invite_links = JSON.parse(fs.readFileSync('./json/invite_links.json'));
    let invite_leaderboard = JSON.parse(
        fs.readFileSync('./json/invite_leaderboard.json'),
    );

    const invite_leaderboard_old = structuredClone(invite_leaderboard);

    let link;
    let what_links = {};

    // Retrieve the link
    if (increase) {
        link = RetrieveLinkUsed(invites, invite_links);

        if (link === 0) return;
    } else {
        what_links = JSON.parse(fs.readFileSync('./json/what_links.json'));
        link = what_links[memberID];
    }

    // Update the leaderboard and save it, if the link is not undefined
    if (link != null) {
        const userID = 'u' + invite_links[link].InviterID;

        if (userID in invite_leaderboard) {
            if (increase) {
                invite_leaderboard[userID].score += 1;
                what_links[memberID] = link;
            } else {
                invite_leaderboard[userID].score -= 1;
                delete what_links[memberID];
                if (invite_leaderboard[userID].score === 0)
                    delete invite_leaderboard[userID];
            }
        } else {
            what_links[memberID] = link;
            invite_leaderboard[userID] = {
                score: 1,
                change: 'NEW',
            };
        }

        // Sort the leaderboard top to low and save it to json file
        let sorted_leaderboard = sort_leaderboard(invite_leaderboard);

        let dynamic_leaderboard = get_change(
            invite_leaderboard_old,
            sorted_leaderboard,
        );
        let invite_leaderboard_json = JSON.stringify(
            dynamic_leaderboard, // change this back to sorted once it works again
            null,
            2,
        );

        fs.writeFileSync(
            './json/invite_leaderboard.json',
            invite_leaderboard_json,
            (err) => {
                if (err) throw err;
                console.log('Leaderboard written to file');
            },
        );

        let what_links_json = JSON.stringify(what_links, null, 2);

        fs.writeFileSync('./json/what_links.json', what_links_json, (err) => {
            if (err) throw err;
            console.log('./json/what_links written to file');
        });

        update_dynamic_Leaderboards(dynamic_leaderboard, guild).then(
            console.log('Leaderboards Updated!'),
        );
    }
}

function RetrieveLinkUsed(invites, invite_links_old) {
    let links = {};
    let link_used = null;

    // Retrieve the current existing links
    links = CreateInviteLinkObject(invites, links);

    // Start comparing to retrieve the link used
    // First for times used
    // Then deal with limited amount uses
    // Split keys in two, overlapping and not overlapping
    let intersecting_keys = Object.keys(links).filter((x) =>
        Object.keys(invite_links_old).includes(x),
    );

    // Check for overlapping keys
    for (let i in intersecting_keys) {
        let key = intersecting_keys[i];
        let old_entry = invite_links_old[key];
        let new_entry = links[key];

        if (old_entry.LinkUses != new_entry.LinkUses) {
            link_used = key;
        }
    }

    if (link_used === null) {
        // Check for keys in old but not new
        let different_keys = Object.keys(invite_links_old).filter(
            (x) => !Object.keys(links).includes(x),
        );

        for (let i in different_keys) {
            let key = different_keys[i];
            let old_entry = invite_links_old[key];

            // If link does not exist anymore in new, but does in old
            // and not expired, means limited uses link
            if (Date.now() < Date.parse(old_entry.ExpirationDate)) {
                link_used = key;
                invite_links_old[key].LinkUses += 1;
            }
        }
    }

    if (link_used != null) {
        // Concat the old and new invites
        const concatted = {
            ...invite_links_old,
            ...links,
        };

        let json_data = JSON.stringify(concatted, null, 2);

        fs.writeFileSync('./json/invite_links.json', json_data, (err) => {
            if (err) throw err;
            console.log('Links written to file');
        });

        return link_used;
    } else {
        console.log('User didnt join with a link, most likely bot');
        return 0;
    }
}

function sort_leaderboard(leaderboard) {
    // Convert the object into an array of key-value pairs
    const keyValueArray = Object.entries(leaderboard);

    // Sort the array based on the score value in descending order
    keyValueArray.sort((a, b) => b[1].score - a[1].score);

    // Create a new Map to store the sorted key-value pairs
    const sortedMap = new Map(keyValueArray);

    // Create a new object to store the sorted key-value pairs
    const sortedObject = Object.fromEntries(sortedMap);

    return sortedObject;
}

function get_change(leaderboard_old, leaderboard_new) {
    const keyValueArray_old = Object.keys(leaderboard_old);
    const keyValueArray_new = Object.keys(leaderboard_new);

    // Bekijk welke keys in de nieuwe zitten en niet in de oude, deze krijgen status 'new'

    // Check for keys in new but not old
    let different_keys = Object.keys(leaderboard_new).filter(
        (x) => !Object.keys(leaderboard_old).includes(x),
    );

    for (let i in different_keys) {
        leaderboard_new[different_keys[i]].change = 'NEW';
    }

    // Check what keys intersect
    let intersecting_keys = Object.keys(leaderboard_new).filter((x) =>
        Object.keys(leaderboard_old).includes(x),
    );

    for (let j in intersecting_keys) {
        let key = intersecting_keys[j];
        let position_old = keyValueArray_old.indexOf(key);
        let position_new = keyValueArray_new.indexOf(key);

        if (position_new > position_old) {
            leaderboard_new[key].change = 'DOWN';
        } else if (position_new < position_old) {
            leaderboard_new[key].change = 'UP';
        } else if (position_new === position_old) {
            leaderboard_new[key].change = 'SAME';
        } else {
            console.log('Wtf this is not supposed to happen');
        }
    }

    return leaderboard_new;
}

async function update_dynamic_Leaderboards(leaderboard, guild) {
    const emote_dict = {
        SAME: '⛔',
        UP: '⬆️',
        DOWN: '⬇️',
        NEW: '🆕',
    };

    const invite_leaderboard = leaderboard;

    if (Object.keys(invite_leaderboard).length === 0) {
        console.log('No entries on leaderboard yet');
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Invite Leaderboard')
            .setDescription('There is nobody on the leaderboard yet!');
        await loop_leaderboards(embed, guild);
        return;
    }

    const invite_leaderboard_arr = Object.keys(invite_leaderboard).map(
        (key) => [
            key.substring(1),
            invite_leaderboard[key].score,
            invite_leaderboard[key].change,
        ],
    );

    const all_members = await guild.members.fetch();
    const all_memberIDs = Array.from(all_members.keys());
    let unknown_members = 0;

    const memberPromises = invite_leaderboard_arr.map(async (user, index) => {
        try {
            if (all_memberIDs.includes(String(user[0]))) {
                const member = await guild.members.fetch(String(user[0]));
                return `${index + 1 - unknown_members}. ${
                    member.nickname ?? member.user.username
                } - ${user[1]} - ${emote_dict[user[2]]}`;
            } else {
                unknown_members += 1;
            }
        } catch (error) {
            console.error(`Error fetching member ${String(user[0])}`, error);
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
