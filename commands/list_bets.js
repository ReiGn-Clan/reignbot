const { MongoClient } = require('mongodb');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const uri = `mongodb+srv://admin:x6UPPGjB2JPaTlYG@cluster0.jialcet.mongodb.net/gambling`;
const client = new MongoClient(uri);
const db = client.db('gambling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listbets')
        .setDescription('Lists the existing bets'),

    async execute(interaction) {
        const bets = await db.collection('bets');

        const bet_array = await bets
            .aggregate({
                $match: {
                    active: true,
                },
            })
            .toArray();

        if (bet_array.length === 0) {
            await interaction.reply('There is no existing bets');
            return;
        }

        const memberPromises = bet_array.map(async (bet) => {
            return [
                `${bet._id}`,
                `${bet.description}`,
                `${[bet.option_1, bet.option_2]}`,
            ];
        });

        const betsData = (await Promise.all(memberPromises)).filter(
            (entry) => entry !== undefined || null,
        );

        const fields = [
            {
                name: 'Name',
                value: betsData.map((entry) => entry[0]).join('\n'),
                inline: true,
            },
            {
                name: 'Description',
                value: betsData.map((entry) => entry[1]).join('\n'),
                inline: true,
            },
            {
                name: 'Options',
                value: betsData.map((entry) => entry[2]).join('\n'),
                inline: true,
            },
        ];

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('BetList')
            .setDescription('The existing bets in the server')
            .addFields(fields);

        await interaction.reply({ embeds: [embed] });
    },
};
