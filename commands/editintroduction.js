const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');
const { config_to_use } = require('../general_config.json');
const { introductionsDBEnv, variousIDs } = require(`../${config_to_use}`);
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { handleEditIntroduction } = require('../src/modules/introductions');
const db = mongo_bongo.getDbInstance(introductionsDBEnv);

async function editintroduction(interaction){
    const awardedIntroductionsCollection = await db.collection('users');

    const introMetaData = await awardedIntroductionsCollection.findOne({
        userid: interaction.user.id,
    });
    const introChannel = await interaction.guild.channels.fetch(variousIDs[4].introductionsChannel);
    const introToEdit = await introChannel.messages.fetch(introMetaData.introductionid);
    const embedFields = introToEdit.embeds[0].data.fields;

    const modal = new ModalBuilder()
        .setCustomId(interaction.id)
        .setTitle('Introduction');

    const nameInput = new TextInputBuilder()
        .setCustomId('nameTextInput')
        .setLabel(`What's your name?`)
        .setStyle(TextInputStyle.Short)
        .setValue(embedFields[0].value);

    const ageInput = new TextInputBuilder()
        .setCustomId('ageTextInput')
        .setLabel('How old are you?')
        .setStyle(TextInputStyle.Short)
        .setValue(embedFields[1].value);

    const countryInput = new TextInputBuilder()
        .setCustomId('countryTextInput')
        .setLabel('Where are you from?')
        .setStyle(TextInputStyle.Short)
        .setValue(embedFields[2].value);

    const hobbiesWorkInput = new TextInputBuilder()
        .setCustomId('hobbiesWorkTextInput')
        .setLabel('What do you do for work/study/hobbies?')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(embedFields[3].value);

    const funFactInput = new TextInputBuilder()
        .setCustomId('funFactTextInput')
        .setLabel('Do you have any fun facts?')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(embedFields[4].value);

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

    interaction
        .awaitModalSubmit({
            filter: (i) =>
                i.customId === interaction.id &&
                i.user.id === interaction.user.id,
            time: 1500000,
        })
        .then(async (modalInteraction) => {
            const form = {
                name: modalInteraction.fields.getTextInputValue(
                    'nameTextInput',
                ),
                age: modalInteraction.fields.getTextInputValue('ageTextInput'),
                country:
                    modalInteraction.fields.getTextInputValue(
                        'countryTextInput',
                    ),
                hobbiesWork: modalInteraction.fields.getTextInputValue(
                    'hobbiesWorkTextInput',
                ),
                funFact:
                    modalInteraction.fields.getTextInputValue(
                        'funFactTextInput',
                    ),
            };

            if (isNaN(form.age)) {
                console.log('Age dumb');
                await modalInteraction.reply({
                    content:
                        'Please only use numbers in the age category! Type /makeintroduction to try again.',
                    ephemeral: true,
                });
                return;
            } else {
                await modalInteraction.reply({
                    content:'Introduction edited sucessfully.',
                    ephemeral: true,
                });
                await handleEditIntroduction(modalInteraction,interaction, form, introToEdit);
                return;
            }
        })
        .catch(console.error);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editintroduction')
        .setDescription('Edit your introduction'),
    execute: editintroduction,
};
