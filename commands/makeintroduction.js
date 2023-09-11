const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
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
    const filter = (interaction) =>
        interaction.customId === 'introductionModal';
    interaction
        .awaitModalSubmit({ filter, time: 300_000 })
        .then(async (interaction) => {
            const form = {
                name: interaction.fields.getTextInputValue('nameTextInput'),
                age: interaction.fields.getTextInputValue('ageTextInput'),
                country:
                    interaction.fields.getTextInputValue('countryTextInput'),
                hobbiesWork: interaction.fields.getTextInputValue(
                    'hobbiesWorkTextInput',
                ),
                funFact:
                    interaction.fields.getTextInputValue('funFactTextInput'),
            };
            if (!isNaN(form.age)) {
                await introductions.getForm(interaction, form);
                await interaction.reply({
                    content: 'Introduction submitted successfully.',
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content:
                        'Please only use numbers in the age category! Type /makeintroduction to try again.',
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
