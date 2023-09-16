const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');
const {config_to_use} = require('../general_config.json');
const {introductionsDBEnv, variousIDs} = require(`../${config_to_use}`);
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(introductionsDBEnv);
const introductions = require('../src/modules/introductions.js');


async function editintroduction(interaction){
    const awardedIntroductionsCollection = await db.collection('users');
    
    const introMetaData = await awardedIntroductionsCollection.findOne({
        userID: interaction.user.id,
    });
    const introChannel = await interaction.guild.channels.fetch(variousIDs[4].introductionsChannel);
    const introToEdit = await introChannel.messages.fetch(introMetaData.introductionID);
    console.log(introToEdit);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editintroduction')
        .setDescription('Edit your introduction'),
    execute: editintroduction,
};