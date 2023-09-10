const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRow,
    ActionRowBuilder,
} = require('discord.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');

async function makeIntroduction(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('myModal')
        .setTitle('ReiGn XP betting');

    const nameTextInput = new TextInputBuilder()
        .setCustomId('nameTextInput')
        .setLabel(`What's your name?`)
        .setStyle(TextInputStyle.Short);

    const ageInput = new TextInputBuilder()
        .setCustomId('ageTextInput')
        .setLabel('How old are you?')
        .setStyle(TextInputStyle.Short);

    const countryInput = new TextInputBuilder()
        .setCustomId('countryTextInput')
        .setLabel('Where are you from?')
        .setStyle(TextInputStyle.Short);

    const gamesInput = new TextInputBuilder()
        .setCustomId('gamesTextInput')
        .setLabel('What games do you play?')
        .setStyle(TextInputStyle.Short);

    const hobbiesInput = new TextInputBuilder()
        .setCustomId('hobbiesTextInput')
        .setLabel('What are your hobbies?')
        .setStyle(TextInputStyle.Paragraph);

    const careerInput = new TextInputBuilder()
        .setCustomId('careerTextInput')
        .setLabel('What do you do for work? (And or study)')
        .setStyle(TextInputStyle.Paragraph);

    const funFactInput = new TextInputBuilder()
        .setCustomId('funFactTextInput')
        .setLabel('Do you have any fun facts?')
        .setStyle(TextInputStyle.Paragraph);

    const {
        nameActionRow,
        ageActionRow,
        countryActionRow,
        gamesActionRow,
        hobbiesActionRow,
        careerActionRow,
        funFactActionRow,
    } = new ActionRowBuilder().addComponents(
        nameTextInput,
        ageInput,
        countryInput,
        gamesInput,
        hobbiesInput,
        careerInput,
        funFactInput,
    );

    modal.addComponents(
        nameActionRow,
        ageActionRow,
        countryActionRow,
        gamesActionRow,
        hobbiesActionRow,
        /*careerActionRow,
        funFactActionRow*/
    );
    await interaction.showModal(modal);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('makeintroduction')
        .setDescription('Make an introduction'),
    execute: makeIntroduction,
};
