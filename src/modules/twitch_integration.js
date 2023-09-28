const {config_to_use} = require('../../general_config.json');
const {discordAPIBotStuff, variousIDs} = require(`../../${config_to_use}`);

const ApiClient = require('@twurple/api');
const auth= require('@twurple/auth');

const clientId = 'v68hozjmzyo3gfey18trucp5colj8e';
const clientSecret = '0qrhdlqgrod0h95gmz5pgyzijda99h';
const authProvider = new auth.AppTokenAuthProvider(clientId, clientSecret);
const newApiObj = new ApiClient.ApiClient({authProvider});

async function isLive(client) {
	const user = await newApiObj.users.getUserByName('phoenixrose24');
	if (!user) {
		return;
	}

    const subscription = await newApiObj.streams.getStreamByUserId(user);
    if (subscription !== (undefined || null)){
        handleGoLive(client);
    } else {
        handleGoOffline(client);
        return;
    }
}

async function handleGoLive(client){
    const guild = await client.guilds.cache.get(discordAPIBotStuff[1].guildID);
    const member = await guild.members.fetch('479407032848613376');
    const liveRole = await guild.roles.cache.get('1157008708165959680');
    const followerRoleID = '1156598612046909490';
    const followerMention = `<@&${followerRoleID}>`;
    const channel = await client.channels.fetch(variousIDs[5].socialUpdatesChannel);

    const hasRole = member.roles.cache.some((role) => role.name === liveRole.name);
    if (hasRole){
        console.log('User already has live role! Skipping message');
        return;
    }
    else{
        await channel.send(
            `${followerMention}, ${member.user} has gone live! Check out their stream at https://www.twitch.tv/phoenixrose24`
            );
    }
    
    member.roles.add(liveRole)
    .then(()=>{
        console.log(`Added role ${liveRole.name} to ${member.user.username}.`);
    })
    .catch((error) =>{
        console.error(error);
    });    
}

async function handleGoOffline(client){
    const guild = await client.guilds.cache.get(discordAPIBotStuff[1].guildID);
    const member = await guild.members.fetch('479407032848613376');
    const liveRole = await guild.roles.cache.get('1157008708165959680');

    const hasRole = member.roles.cache.some((role) => role.name === liveRole.name);
    if(hasRole){
        member.roles.remove(liveRole);
        console.log(`Removed role ${liveRole.name} from ${member.user.username}`);
    } else{
        console.log(`${member.user.username} doesn't have LIVE role, skipping.`);
        return;
    }
}

module.exports = {isLive};