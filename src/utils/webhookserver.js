const express = require('express');
const { config_to_use } = require('../../general_config.json');
const { webserverPort } = require(`../../${config_to_use}`);
const app = express();
const faceit_integration = require('../modules/faceit_integration.js');
const topgg_integration = require('../modules/topgg_integration.js');
const Topgg = require('@top-gg/sdk');
const webhook = new Topgg.Webhook('r31gn0nt0p');

function startWebHookServer() {
    app.use(express.json());

    app.post('/faceit_match_ended/', (req, res) => {
        const matchData = req.body;
        console.log('Received webhook notification');
        faceit_integration.rewardParticipants(matchData);
        res.sendStatus(200);
    });

    app.post(
        '/topgg/',
        webhook.listener((vote) => {
            // vote is your vote object
            console.log('Received user vote on topgg');
            topgg_integration.rewardVote(vote.user);
        }),
    );

    app.listen(webserverPort, () => {
        console.log(`Web server listening on port ${webserverPort}`);
    });
}
module.exports = { startWebHookServer };
