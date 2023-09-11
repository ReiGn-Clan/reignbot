const { config_to_use } = require('../../general_config.json');
const Levels = require('../utils/syb_xp.js');
const { xpDbEnvironment, variousIDs } = require(`../../${config_to_use}`);
const mongo_bongo = require('../utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(xpDbEnvironment);
const {EmbedBuilder} = require('discord.js');

let interactionObj = null;
let introduction = null;
let disClient = null;

async function getForm(interaction, form) {
    interactionObj = interaction;
    introduction = form;
    await handleIntroduction();
}

async function setClient(client){
    disClient = client;
}

async function handleIntroduction (){
    const channel = await disClient.channels.fetch(variousIDs[4].introductionsChannel);
    const avatarURL = interactionObj.user.displayAvatarURL({format: 'png', dynamic: true, size: 256});

    const introEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`${interactionObj.user.username}'s Introduction`)
        .setAuthor({name: `${interactionObj.user.username}`, iconURL: avatarURL})
        .setThumbnail('https://i.imgur.com/4H0ZiTv.png')
        .addFields(
            {name: '**Name: **', value: `${introduction.name}`},
            {name: '**Age: **', value: `${introduction.age}`},
            {name: '**Country: **', value: `${introduction.country}`},
            {name: '**Work/Studies/Hobbies: **', value: `${introduction.hobbiesWork}`},
            {name: '**Fun Fact: **', value: `${introduction.funFact}`},
        )
        .setTimestamp()
        .setFooter({text: 'If you want an introduction use /makeintroduction'});
    
    channel.send({embeds: [introEmbed]});
}
module.exports = {
    getForm,
    setClient
};