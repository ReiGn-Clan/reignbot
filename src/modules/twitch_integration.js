const WebSocket = require('ws');
const ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

ws.on('open', function () {
    ws.send('something');
});
ws.on('message', function (data, flags) {
    // flags.binary will be set if a binary data is received
    // flags.masked will be set if the data was masked
    console.log(JSON.parse(data));
});

ws.send();
