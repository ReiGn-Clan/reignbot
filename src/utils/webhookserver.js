const express = require('express');
const { config_to_use } = require('../../general_config.json');
const { webServerPort } = require(`../../${config_to_use}`);
const app = express();
const faceit_integration = require('../modules/faceit_integration.js');
const twitch_integration = require('../modules/twitch_integration.js');
const https = require('https');
const fs = require('fs');
const certKeyPath = '/etc/letsencrypt/live/yourdomain.com/privkey.pem'; // Update with the actual path
const certFilePath = '/etc/letsencrypt/live/yourdomain.com/fullchain.pem'; // Update with the actual path

function startWebHookServer() {
    app.use(express.json());

    app.post('/faceit_match_ended/', (req, res) => {
        const matchData = req.body;
        console.log('Received webhook notification');
        faceit_integration.rewardParticipants(matchData);
        res.sendStatus(200);
    });

    app.post('/webhook/callback', (req, res) => {
        const { challenge } = req.body;
        // Twitch sends a challenge query param to verify your endpoint
        if (challenge) {
            return res.status(200).send(challenge);
        }

        const { subscription, event } = req.body;

        twitch_integration.handleEventsub(
            subscription.type,
            event.broadcaster_user_name,
        );

        res.sendStatus(200);
    });

    const httpsOptions = {
        key: fs.readFileSync(certKeyPath, 'utf-8'),
        cert: fs.readFileSync(certFilePath, 'utf-8'),
    };

    https.createServer(httpsOptions, app).listen(webServerPort, () => {
        console.log(`HTTPS server listening on port ${webServerPort}`);
    });
}

module.exports = { startWebHookServer };
