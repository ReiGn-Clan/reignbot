const moment = require('moment');
const { config_to_use } = require('../../general_config.json');
const { discordAPIBotStuff, newMemberChatDBEnv} = require(`../../${config_to_use}`);
const mongo_bongo = require('../utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(newMemberChatDBEnv);

function setClient(client) {
    discordClient = client;
}

async function getAllMembersPast7Days() {
    const collection = db.collection('new_members');
    const newMembers = await collection.find().toArray();

    console.log('All new members:', newMembers);

    //check which members have joined more than 7 days ago
    const membersPast7Days = newMembers.filter((member) => {
        const joinDate = moment(member.joinDate);
        const currentDate = moment();
        const diff = currentDate.diff(joinDate, 'days');

        return diff > 7;
    });

    return membersPast7Days;
}

async function removeNewMemberRole() {
    const membersPast7Days = await getAllMembersPast7Days();
    console.log('Members who joined more than 7 days ago:', membersPast7Days);

    membersPast7Days.forEach((member) => {
        const guild = discordClient.guilds.cache.get(discordAPIBotStuff.guildId);
        const memberObj = guild.members.cache.get(member.userId);
        const role = guild.roles.cache.find((role) => role.name === 'New Member');
        memberObj.roles.remove(role);
    });
}

module.exports = { setClient, removeNewMemberRole };