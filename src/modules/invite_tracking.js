const fs = require('fs');

function UpdateLinks(invites) {
    let links = {};

    const keys = invites.keys();
    // eslint-disable-next-line no-constant-condition
    while (1) {
        const curr_key = keys.next();
        if (curr_key.done == true) break;

        const inviterId = invites.get(curr_key.value).inviterId;
        links[curr_key.value] = inviterId;
    }

    console.log(links);

    let json_data = JSON.stringify(links, null, 2);

    fs.writeFileSync('invite_links.json', json_data, (err) => {
        if (err) throw err;
        console.log('Links written to file');
    });
}

function UpdateLeaderboard(link, increase = true) {
    // Read in file
    let invite_links = JSON.parse(fs.readFileSync('invite_links.json'));
    let invite_leaderboard = JSON.parse(
        fs.readFileSync('invite_leaderboard.json'),
    );

    const userID = invite_links[link];

    if (userID in invite_leaderboard) {
        if (increase) {
            invite_leaderboard[userID] = invite_leaderboard[userID] + 1;
        } else {
            invite_leaderboard[userID] = invite_leaderboard[userID] - 1;
        }
    } else {
        invite_leaderboard[userID] = 1;
    }

    let json_data = JSON.stringify(invite_leaderboard, null, 2);

    fs.writeFileSync('invite_leaderboard.json', json_data, (err) => {
        if (err) throw err;
        console.log('Leaderboard written to file');
    });
}

function RetrieveLinkUsed() {}

module.exports = { UpdateLinks, UpdateLeaderboard };
