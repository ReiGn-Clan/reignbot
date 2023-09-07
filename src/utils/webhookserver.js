const express = require('express');
const app = express();
const port = 3000;
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

    app.listen(port, () => {
        console.log(`Web server listening on port ${port}`);
    });
}

module.exports = { startWebHookServer };
