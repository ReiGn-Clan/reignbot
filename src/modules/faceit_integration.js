const fetch = require('cross-fetch');
const { faceitJsonAccept, faceitAuth } = require('../../dev_config.json');
const headers = {
    accept: faceitJsonAccept,
    Authorization: faceitAuth,
};

async function parseNicknames() {
    const faceitData = await getAllHubMembers();
    let nicknameArray = [];
    if (faceitData && faceitData.items) {
        nicknameArray = faceitData.items.map((item) =>
            item.nickname.toLowerCase(),
        );
    } else {
        console.error(
            'Failed to get Faceit data or data structure is incorrect.',
        );
    }
    return nicknameArray;
}

async function getHub() {
    let url =
        'https://open.faceit.com/data/v4/hubs/80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12?expanded=game';

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data; // Return the JSON data
    } catch (error) {
        console.error('Error: ', error);
        return null;
    }
}

async function getAllHubMembers() {
    let url =
        'https://open.faceit.com/data/v4/hubs/80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12/members?offset=0&limit=50';

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data; // Return the JSON data
    } catch (error) {
        console.error('Error: ', error);
        return null;
    }
}

async function getAllHubMatches() {
    let url =
        'https://open.faceit.com/data/v4/hubs/80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12/matches?offset=0&limit=50';

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        //console.log(data.items[0].teams.faction1.roster);
        //console.log(data.items[0].results);
        return data; // Return the JSON data
    } catch (error) {
        console.error('Error: ', error);
        return null;
    }
}

module.exports = {
    parseNicknames,
    getHub,
    getAllHubMatches,
};
