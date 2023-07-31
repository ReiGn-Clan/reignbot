const fetch = require('cross-fetch');
const headers = {
    accept: 'application/json',
    Authorization: 'Bearer 79dc9a0d-0eba-4d1c-8bdc-da36b4ff1b44',
};

async function parseNicknames() {
    const faceitData = await getAllHubMembers();

    if (faceitData && faceitData.items) {
        const nicknameArray = faceitData.items.map((item) => item.nickname);
        console.log(nicknameArray);
    } else {
        console.error(
            'Failed to fetch Faceit data or data structure is incorrect.',
        );
    }
    return nicknameArray;
}

async function getHub() {
    let url =
        'https://open.faceit.com/data/v4/hubs/80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12?expanded=game';

    fetch(url, {
        method: 'GET',
        headers: headers,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log(data);
        })
        .catch((error) => {
            console.error('Error: ', error);
        });
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

    fetch(url, {
        method: 'GET',
        headers: headers,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log(data);
        })
        .catch((error) => {
            console.error('Error: ', error);
        });
}

parseUsernames();

module.exports = {
    parseNicknames,
};
