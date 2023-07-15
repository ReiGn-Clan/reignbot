const { MongoClient } = require('mongodb');
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/gambling`;
const client = new MongoClient(uri);
const db = client.db('gambling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createbet')
        .setDescription('Creates a bet')
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of the bet')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('description')
                .setDescription('Description of the bet')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('option_1')
                .setDescription('Option 1 to bet on')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('option_2')
                .setDescription('Option 2 to bet on')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('time')
                .setDescription('How long users can bet for (minutes)')
                .setRequired(true),
        ),

    async execute(interaction) {
        const bets = await db.collection('bets');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const option_1 = interaction.options.getString('option_1');
        const option_2 = interaction.options.getString('option_2');
        const time = interaction.options.getInteger('time') * 60 * 1000;

        const button_option_1 = new ButtonBuilder()
            .setCustomId('option_1')
            .setLabel(option_1)
            .setStyle(ButtonStyle.Primary);

        const button_option_2 = new ButtonBuilder()
            .setCustomId('option_2')
            .setLabel(option_2)
            .setStyle(ButtonStyle.Success);

        /*
        const CancelButton = new ButtonBuilder()
            .setCustomId('cancelbet')
            .setLabel('Cancel Bet')
            .setStyle(ButtonStyle.Danger);
        */

        const row = new ActionRowBuilder().addComponents(
            button_option_1,
            button_option_2,
        );

        let option_1_bets = [];
        let option_2_bets = [];
        let option_1_total = 0;
        let option_2_total = 0;
        let members_betted = [];

        // Let the user know they created a bet
        await interaction.reply({ content: 'Created a bet!', ephemeral: true });

        // Send the bet to the channel
        let bet_message = null;

        interaction.channel
            .send({
                content: `A bet has been created! The bet is: ${description} \n The current standing = ${option_1}: **${50}%**  - ${option_2}: **${50}%**`,
                components: [row],
            })
            .then(async (sent) => {
                bet_message = sent;
            });

        // Create collector for button clicks
        const collector = interaction.channel.createMessageComponentCollector({
            time: time,
        });

        collector.on('collect', (collected) => {
            if (!members_betted.includes(collected.user.id)) {
                // Prompt the user to enter a number
                collected.reply({
                    content:
                        'Please type the amount of xp you wanna bet in chat:',
                    ephemeral: true,
                });

                // Listen for the number entered by the user
                const numberFilter = (response) =>
                    response.author.id === collected.user.id;

                const numberCollector =
                    collected.channel.createMessageCollector({
                        filter: numberFilter,
                        time: 30000,
                    });

                numberCollector.on('collect', (response) => {
                    // Process the entered number
                    const enteredNumber = parseInt(response.content);
                    if (Number.isInteger(enteredNumber)) {
                        collected.followUp({
                            content: `You betted ${enteredNumber}!`,
                            ephemeral: true,
                        });
                        members_betted.push(collected.user.id);

                        console.log(collected.customId);

                        if (collected.customId == 'option_1') {
                            option_1_total += enteredNumber;
                            option_1_bets.push({
                                user: collected.user.id,
                                amount: enteredNumber,
                            });
                        } else {
                            option_2_total += enteredNumber;
                            option_2_bets.push({
                                user: collected.user.id,
                                amount: enteredNumber,
                            });
                        }

                        bet_message
                            .edit({
                                content: `A bet has been created! The bet is: ${description} \n The current standing = ${option_1}: **${(
                                    (option_1_total /
                                        (option_1_total + option_2_total)) *
                                    100
                                ).toFixed(2)}%**  - ${option_2}: **${(
                                    (option_2_total /
                                        (option_1_total + option_2_total)) *
                                    100
                                ).toFixed(2)}%**`,
                                components: [row],
                            })
                            .then(console.log('Bet Updated'));

                        response.delete();
                    } else {
                        // Invalid input, prompt the user to enter a valid number
                        collected.followUp({
                            content:
                                'Invalid input, click a button again and enter a number',
                            ephemeral: true,
                        });
                    }
                    numberCollector.stop();
                });

                numberCollector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        // No response received within the given time, handle accordingly
                        interaction.followUp({
                            content:
                                'No number entered. Interaction timed out.',
                            ephemeral: true,
                        });
                    }
                });
            } else {
                collected.reply({
                    content: 'You already betted!',
                    ephemeral: true,
                });
            }
        });

        collector.on('end', async () => {
            // Remove the buttons after the interaction ends
            row.components.forEach((button) => button.setDisabled(true));
            bet_message.edit({
                content: 'Betting time has ended',
                components: [row],
            });

            const doc = {
                _id: name,
                description: description,
                options: [{ one: option_1, two: option_2 }],
                xp_option_1: option_1_total,
                xp_option_2: option_2_total,
                users_option_1: option_1_bets,
                users_option_2: option_2_bets,
            };

            await bets.insertOne(doc);
        });
    },
};
