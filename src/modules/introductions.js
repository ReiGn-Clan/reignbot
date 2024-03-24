const { config_to_use } = require('../../general_config.json');
const Levels = require('../utils/syb_xp.js');
const { variousIDs, introductionsDBEnv, discordAPIBotStuff } = require(
    `../../${config_to_use}`,
);
const mongo_bongo = require('../utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(introductionsDBEnv);

const xp_roles = require('./xp_roles');
const { EmbedBuilder } = require('discord.js');
const token_rates = require('../../token_rates.json');
let interactionObj = null;
let introduction = null;
let disClient = null;

async function getForm(interaction, form) {
    interactionObj = interaction;
    introduction = form;
    await handleMakeIntroduction();
}

async function setClient(client) {
    disClient = client;
}

async function handleMakeIntroduction() {
    const channel = await disClient.channels.fetch(
        variousIDs[4].introductionsChannel,
    );
    const avatarURL = interactionObj.user.displayAvatarURL({
        format: 'png',
        dynamic: true,
        size: 256,
    });

    const introEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${interactionObj.user.username}'s Introduction`)
        .setAuthor({
            name: `${interactionObj.user.username}`,
            iconURL: avatarURL,
        })
        .setThumbnail('https://i.imgur.com/4H0ZiTv.png')
        .addFields(
            { name: '**Name: **', value: `${introduction.name}` },
            { name: '**Age: **', value: `${introduction.age}` },
            { name: '**Country: **', value: `${introduction.country}` },
            {
                name: '**Work/Studies/Hobbies: **',
                value: `${introduction.hobbiesWork}`,
            },
            { name: '**Fun Fact: **', value: `${introduction.funFact}` },
        )
        .setFooter({
            text: 'If you want an introduction use /makeintroduction',
            iconURL: 'https://i.imgur.com/4H0ZiTv.png',
        });

    let userID = interactionObj.user.id;

    const sentIntroduction = await channel.send({ embeds: [introEmbed] });
    const introductionID = sentIntroduction.id;
    await rewardIntroduction(introductionID, userID);
}

async function rewardIntroduction(introductionid, userid) {
    const awardedIntroductionsCollection = await db.collection('users');
    const botInfoChannel = await disClient.channels.fetch(
        '1103780043349573663',
    );

    let hasLeveledUp = await Levels.appendXp(
        userid,
        discordAPIBotStuff[1].guildID,
        token_rates.makeIntroductionReward,
    );
    const userUpdateschannel = await disClient.channels.fetch(
        variousIDs[0].userUpdatesChannel,
    );
    const guild = await disClient.guilds.fetch(discordAPIBotStuff[1].guildID);
    await userUpdateschannel.send({
        content: `${interactionObj.user} You've just earned **${token_rates.makeIntroductionReward}** ReiGn Tokens for posting an introduction! Check out ${botInfoChannel} to see what you can spend them on.`,
    });

    if (hasLeveledUp) {
        try {
            await xp_roles.improvedLevelUp(guild, userid, disClient);
        } catch (error) {
            console.error(error);
        }
    }
    await awardedIntroductionsCollection.insertOne({ userid, introductionid });
}

async function handleEditIntroduction(
    modalInteraction,
    interaction,
    form,
    introToEdit,
) {
    const avatarURL = interaction.user.displayAvatarURL({
        format: 'png',
        dynamic: true,
        size: 256,
    });

    const editIntroEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${interaction.user.username}'s Introduction`)
        .setAuthor({
            name: `${interaction.user.username}`,
            iconURL: avatarURL,
        })
        .setThumbnail('https://i.imgur.com/4H0ZiTv.png')
        .addFields(
            { name: '**Name: **', value: `${form.name}` },
            { name: '**Age: **', value: `${form.age}` },
            { name: '**Country: **', value: `${form.country}` },
            {
                name: '**Work/Studies/Hobbies: **',
                value: `${form.hobbiesWork}`,
            },
            { name: '**Fun Fact: **', value: `${form.funFact}` },
        )
        .setFooter({
            text: 'If you want an introduction use /makeintroduction',
            iconURL: 'https://i.imgur.com/4H0ZiTv.png',
        });
    await introToEdit.edit({ embeds: [editIntroEmbed] });
}
module.exports = {
    getForm,
    setClient,
    handleEditIntroduction,
};
