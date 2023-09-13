const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');
const {config_to_use} = require('../general_config.json');
const {introductionsDBEnv} = require(`../${config_to_use}`);
const introductions = require('../src/modules/introductions.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(introductionsDBEnv);
const awardedIntroductionsCollection = db.collection('users');

async function makeIntroduction(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('introductionModal')
        .setTitle('Introduction');

    const nameInput = new TextInputBuilder()
        .setCustomId('nameTextInput')
        .setLabel(`What's your name?`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Your name.');

    const ageInput = new TextInputBuilder()
        .setCustomId('ageTextInput')
        .setLabel('How old are you?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Your age. It must be a number.');

    const countryInput = new TextInputBuilder()
        .setCustomId('countryTextInput')
        .setLabel('Where are you from?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Where you're from.`);

    const hobbiesWorkInput = new TextInputBuilder()
        .setCustomId('hobbiesWorkTextInput')
        .setLabel('What do you do for work/study/hobbies?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('What you do for work/study/hobbies.');

    const funFactInput = new TextInputBuilder()
        .setCustomId('funFactTextInput')
        .setLabel('Do you have any fun facts?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(
            'Do you have any fun facts? About yourself or in general.',
        );

    const nameActionRow = new ActionRowBuilder().addComponents(nameInput);
    const ageActionRow = new ActionRowBuilder().addComponents(ageInput);
    const countryActionRow = new ActionRowBuilder().addComponents(countryInput);
    const hobbiesWorkActionRow = new ActionRowBuilder().addComponents(
        hobbiesWorkInput,
    );
    const funFactActionRow = new ActionRowBuilder().addComponents(funFactInput);

    modal.addComponents(
        nameActionRow,
        ageActionRow,
        countryActionRow,
        hobbiesWorkActionRow,
        funFactActionRow,
    );
    
    await interaction.showModal(modal);
    const filter = (modalInteraction) =>
    modalInteraction.customId === 'introductionModal' && modalInteraction.user.id === interaction.user.id;
    interaction
        .awaitModalSubmit({ filter, time: 1500000 })
        .then(async (modalInteraction) => {
            const submitterID = modalInteraction.user.id;
            const alreadyMadeIntro = await awardedIntroductionsCollection.findOne({submitterID});
            const form = {
                name: modalInteraction.fields.getTextInputValue('nameTextInput'),
                age: modalInteraction.fields.getTextInputValue('ageTextInput'),
                country:
                modalInteraction.fields.getTextInputValue('countryTextInput'),
                hobbiesWork: modalInteraction.fields.getTextInputValue(
                    'hobbiesWorkTextInput',
                ),
                funFact:
                modalInteraction.fields.getTextInputValue('funFactTextInput'),
            };
            if (!isNaN(form.age) && alreadyMadeIntro === 'undefined') {
                await introductions.getForm(interaction, form);
                await modalInteraction.reply({
                    content: 'Introduction submitted successfully.',
                    ephemeral: true,
                });
            } 
            if (isNaN(form.age)) {
                await modalInteraction.reply({
                    content:
                        'Please only use numbers in the age category! Type /makeintroduction to try again.',
                    ephemeral: true,
                });
            } else {
                await modalInteraction.reply({
                    content: `You're only allowed to make one introduction!`,
                    ephemeral: true,
                });
            }
        })
        .catch(console.error);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('makeintroduction')
        .setDescription('Make an introduction'),
    execute: makeIntroduction,
};
