const moment = require('moment');
const { config_to_use } = require('../../general_config.json');
const { discordAPIBotStuff, newMemberChatDBEnv } = require(
    `../../${config_to_use}`,
);
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
    const withNewRole = membersPast7Days.filter((member) => member.hasNewRole === true);

    console.log('Members who joined more than 7 days ago:', membersPast7Days);

    withNewRole.forEach(async (member) => {
        const guild = discordClient.guilds.cache.get(discordAPIBotStuff.guildID);
        const memberObj = guild.members.cache.get(member.userID);


        if (!memberObj || !role) {
            console.log('Member or role not found in guild:', member.userID, role.name);
            return;
        }
        
        //remove role
        await memberObj.roles.remove('1242542742488354889');

        //update db
        const collection = db.collection('new_members');
        const mongoRes = await collection.updateOne({ userID: member.userID }, { $set: { hasNewRole: false } });

        if (mongoRes.modifiedCount === 1) {
            console.log('Role removed and db updated for:', member.userID);
        } else {
            console.log('Role removed but db not updated for:', member.userID);
        }

        return;
    });
}

module.exports = { setClient, removeNewMemberRole };
