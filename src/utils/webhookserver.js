const express = require('express');
const app = express();
const port = 3000;
const faceit_integration = require('../modules/faceit_integration.js');

function startWebHookServer() {
    app.use(express.json());

    app.post('/faceit_match_ended/', (req, res) => {
        const matchData = req.body;
        console.log('Received webhook notification');
        faceit_integration.rewardParticipants(matchData);
        res.sendStatus(200);
    });

    app.listen(port, () => {
        console.log(`Web server listening on port ${port}`);
    });
}

module.exports = { startWebHookServer };
