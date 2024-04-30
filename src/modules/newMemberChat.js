const { config_to_use } = require('../../general_config.json');
const {discordAPIBotStuff} = require(`../../${config_to_use}`);

async function cacheMembersIntoMongo(client) {
    //fetch all members from the server
    const members = await client.guilds.cache.get (discordAPIBotStuff.guildID).members.fetch();
    
    //insert members into the database
    const collection = await client.db.collection('members');
    console.log(members);
}

module.exports = {
    cacheMembersIntoMongo
};