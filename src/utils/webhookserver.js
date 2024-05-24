const express = require('express');
const { config_to_use } = require('../../general_config.json');
const { webServerPort, privCertLoc, fullchainCertLoc } = require(
    `../../${config_to_use}`,
);
const app = express();
const faceit_integration = require('../modules/faceit_integration.js');
const twitch_integration = require('../modules/twitch_integration.js');
const https = require('https');
const fs = require('fs');
const certKeyPath = privCertLoc; // Update with the actual path
const certFilePath = fullchainCertLoc; // Update with the actual path
const cron = require('node-cron');
const { removeNewMemberRole } = require('../modules/new_member_chat.js');

function startWebHookServer() {
    app.use(express.json());

    app.post('/faceit_match_ended/', (req, res) => {
        const matchData = req.body;
        console.log('Received webhook notification');
        faceit_integration.rewardParticipants(matchData);
        res.sendStatus(200);
    });

    /*app.post('/webhook/callback', (req, res) => {
        const { challenge } = req.body;
        // Twitch sends a challenge query param to verify your endpoint
        if (challenge) {
            return res.status(200).send(challenge);
        }

        const { subscription, event } = req.body;

        //twitch_integration.handleEventsub(
            subscription.type,
            event.broadcaster_user_name,
        );

        res.sendStatus(200);
    });*/

    const httpsOptions = {
        key: fs.readFileSync(certKeyPath, 'utf-8'),
        cert: fs.readFileSync(certFilePath, 'utf-8'),
    };

    https.createServer(httpsOptions, app).listen(webServerPort, () => {
        console.log(`HTTPS server listening on port ${webServerPort}`);
    });
}

// schedule a cron job for midnight every day to remove the new member role from members who joined more than 7 days ago
cron.schedule('0 0 * * *', async () => {
    await removeNewMemberRole();
});

module.exports = { startWebHookServer };
