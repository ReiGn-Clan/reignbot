const express = require('express');
const app = express();
const port = 3000;
const faceit_integration = require('../modules/faceit_integration.js');

app.use(express.json());

app.post('/webhook/', (req,res)=>{
    const matchData = req.body;
    console.log("Received webhook notification: ", matchData);
    res.sendStatus(200);
    faceit_integration.rewardParticipants();
});

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
  });