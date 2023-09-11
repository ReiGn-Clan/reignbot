const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRow,
    ActionRowBuilder,
} = require('discord.js');
const introductions = require('../src/modules/introductions.js');

async function makeIntroduction(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('introductionModal')
        .setTitle('Introduction');

    const nameInput = new TextInputBuilder()
        .setCustomId('nameTextInput')
        .setLabel(`What's your name?`)
        .setStyle(TextInputStyle.Short);

    const ageInput = new TextInputBuilder()
        .setCustomId('ageTextInput')
        .setLabel('How old are you?')
        .setStyle(TextInputStyle.Short)

    const countryInput = new TextInputBuilder()
        .setCustomId('countryTextInput')
        .setLabel('Where are you from?')
        .setStyle(TextInputStyle.Short);

    const hobbiesWorkInput = new TextInputBuilder()
        .setCustomId('hobbiesWorkTextInput')
        .setLabel('What do you do for work/hobbies?')
        .setStyle(TextInputStyle.Paragraph);

    const funFactInput = new TextInputBuilder()
        .setCustomId('funFactTextInput')
        .setLabel('Do you have any fun facts?')
        .setStyle(TextInputStyle.Paragraph);

    const nameActionRow = new ActionRowBuilder().addComponents(nameInput);
    const ageActionRow = new ActionRowBuilder().addComponents(ageInput);
    const countryActionRow = new ActionRowBuilder().addComponents(countryInput);
    const hobbiesWorkActionRow = new ActionRowBuilder().addComponents(hobbiesWorkInput);
    const funFactActionRow = new ActionRowBuilder().addComponents(funFactInput);

    modal.addComponents(
        nameActionRow,
        ageActionRow,
        countryActionRow,
        hobbiesWorkActionRow,
        funFactActionRow
    );

    await interaction.showModal(modal);
    const filter = (interaction) => interaction.customId === 'introductionModal';
    interaction.awaitModalSubmit({filter, time: 300_000})
        .then(async interaction => {
            const form = {
                name : interaction.fields.getTextInputValue('nameTextInput'),
                age : interaction.fields.getTextInputValue('ageTextInput'),
                country: interaction.fields.getTextInputValue('countryTextInput'),
                hobbiesWork: interaction.fields.getTextInputValue('hobbiesWorkTextInput'),
                funFact: interaction.fields.getTextInputValue('funFactTextInput')
            };
            await introductions.getForm(interaction, form);
            await interaction.reply({content: 'Introduction submitted successfully.', ephemeral: true});
        }).catch(console.error);
     
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('makeintroduction')
        .setDescription('Make an introduction'),
    execute: makeIntroduction,
};
