const fs = require('fs');

// Function to update the list of existing invites,
function UpdateLinks(invites) {
    // Create empty object
    let links = JSON.parse(fs.readFileSync('invite_links.json'));

    // Get the keys == invite link
    const keys = invites.keys();
    // Loop over the links and save " link : [creator, times used]"
    // eslint-disable-next-line no-constant-condition
    while (1) {
        const curr_key = keys.next();
        if (curr_key.done == true) break;

        const inviterId = invites.get(curr_key.value).inviterId;
        const linkUsed = invites.get(curr_key.value).uses;
        links[curr_key.value] = [inviterId, linkUsed];
    }

    // Save the information to JSON file
    let json_data = JSON.stringify(links, null, 2);

    fs.writeFileSync('invite_links.json', json_data, (err) => {
        if (err) throw err;
        console.log('Links written to file');
    });
}

// Update the leaderboard file, not sorted (yet)
function UpdateLeaderboard(invites, memberID, increase = true) {
    // Read in file
    let invite_links = JSON.parse(fs.readFileSync('invite_links.json'));
    let invite_leaderboard = JSON.parse(
        fs.readFileSync('invite_leaderboard.json'),
    );

    let link;
    let what_links = {};

    // Retrieve the link
    if (increase) {
        link = RetrieveLinkUsed(invites, invite_links);

        if (link === 0) return;
    } else {
        what_links = JSON.parse(fs.readFileSync('what_links.json'));
        link = what_links[memberID];
    }

    // Update the leaderboard and save it, if the link is not undefined
    if (link != null) {
        const userID = invite_links[link][0];

        if (userID in invite_leaderboard) {
            if (increase) {
                invite_leaderboard[userID] = invite_leaderboard[userID] + 1;
                what_links[memberID] = link;
            } else {
                invite_leaderboard[userID] = invite_leaderboard[userID] - 1;
                delete what_links[memberID];
            }
        } else {
            what_links[memberID] = link;
            invite_leaderboard[userID] = 1;
        }

        // Sort the leaderboard top to low and save it to json file
        let sorted_leaderboard = sort_leaderboard(invite_leaderboard);
        let invite_leaderboard_json = JSON.stringify(
            sorted_leaderboard,
            null,
            2,
        );

        fs.writeFileSync(
            'invite_leaderboard.json',
            invite_leaderboard_json,
            (err) => {
                if (err) throw err;
                console.log('Leaderboard written to file');
            },
        );

        let what_links_json = JSON.stringify(what_links, null, 2);

        fs.writeFileSync('what_links.json', what_links_json, (err) => {
            if (err) throw err;
            console.log('what_links written to file');
        });
    }
}

function RetrieveLinkUsed(invites, invite_links_old) {
    let links = {};
    let link_used = null;
    const keys = invites.keys();

    // eslint-disable-next-line no-constant-condition
    while (1) {
        const curr_key = keys.next();
        if (curr_key.done == true) break;

        const inviterId = invites.get(curr_key.value).inviterId;
        const linkUsed = invites.get(curr_key.value).uses;
        links[curr_key.value] = [inviterId, linkUsed];

        if (
            JSON.stringify(links[curr_key.value]) !=
            JSON.stringify(invite_links_old[curr_key.value])
        ) {
            link_used = curr_key.value;
        }
    }

    if (link_used != null) {
        // Concat the old and new invites
        const concatted = {
            ...invite_links_old,
            ...links,
        };

        let json_data = JSON.stringify(concatted, null, 2);

        fs.writeFileSync('invite_links.json', json_data, (err) => {
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
    const sortable = Object.fromEntries(
        Object.entries(leaderboard).sort(([, a], [, b]) => b - a),
    );
    return sortable;
}

module.exports = { UpdateLinks, UpdateLeaderboard, RetrieveLinkUsed };
