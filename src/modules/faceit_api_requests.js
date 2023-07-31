const fetch = require('cross-fetch');
const headers = {
    'accept': 'application/json',
    'Authorization': 'Bearer 79dc9a0d-0eba-4d1c-8bdc-da36b4ff1b44'
}

async function getHub(){
    let url = 'https://open.faceit.com/data/v4/hubs/80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12?expanded=game';

    fetch(url, {
        method: 'GET',
        headers: headers
    })
    .then(response => {
        if (!response.ok){
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Error: ', error);
    });

}

async function getAllHubMembers(){
    let url = 'https://open.faceit.com/data/v4/hubs/80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12/members?offset=0&limit=50';

    fetch(url, {
        method: 'GET',
        headers: headers
    })
    .then(response => {
        if (!response.ok){
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Error: ', error);
    });
}

async function getAllHubMatches(){
    let url = 'https://open.faceit.com/data/v4/hubs/80ee5fb1-0b2b-4c2c-9828-ecf8fc925b12/matches?offset=0&limit=50';

    fetch(url, {
        method: 'GET',
        headers: headers
    })
    .then(response => {
        if (!response.ok){
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Error: ', error);
    });
}

module.exports = {
    getHub,
    getAllHubMembers,
    getAllHubMatches
};