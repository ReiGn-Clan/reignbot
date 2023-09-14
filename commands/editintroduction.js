const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');
const {config_to_use} = require('../general_config.json');
const {introductionDBEnv} = require(`../${config_to_use}`);
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(introductionDBEnv);


async function editintroduction(interaction){
    const awardedIntroductionsCollection = await db.collection('users');
    const userID = interaction.user.id;
    const alreadyMadeIntro = await awardedIntroductionsCollection.findOne({
        userID,
    });
    console.log(alreadyMadeIntro);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editintroduction')
        .setDescription('Edit your introduction'),
    execute: editintroduction,
};