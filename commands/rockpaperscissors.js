const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { gamblingDbEnvironment } = require(`../${config_to_use}`);
const db = mongo_bongo.getDbInstance(gamblingDbEnvironment);
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');

async function rockPaperScissors(interaction) {
    const tokens = interaction.options.getInteger('tokens');
    const user = interaction.options.getUser('user');
    const gambles = db.collection('gambles');

    const init_userXP = await Levels.fetch(
        interaction.user.id,
        interaction.guild.id,
    );

    if (init_userXP.xp <= tokens) {
        await interaction.reply({
            content: 'You do not have enough tokens for this!',
            ephemeral: true,
        });
        return;
    }

    const button_option_rock = new ButtonBuilder()
        .setCustomId('rock')
        .setLabel('Rock')
        .setStyle(ButtonStyle.Primary);

    const button_option_paper = new ButtonBuilder()
        .setCustomId('paper')
        .setLabel('Paper')
        .setStyle(ButtonStyle.Secondary);

    const button_option_scissors = new ButtonBuilder()
        .setCustomId('scissors')
        .setLabel('Scissors')
        .setStyle(ButtonStyle.Success);

    const button_option_cancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
        button_option_rock,
        button_option_paper,
        button_option_scissors,
        button_option_cancel,
    );

    await interaction.reply({
        content: 'Started a game of rock paper scissors!',
        ephemeral: true,
    });

    // Send the bet to the channel
    let bet_message = null;
    let timeout = true;

    if (user == null) {
        await interaction.channel
            .send({
                content: `A game of rock paper scissors has been created! You are betting for **${tokens} ReiGn Tokens**! \n\n The winnner will take home **${(
                    tokens *
                    2 *
                    0.95
                ).toFixed(
                    0,
                )}** **ReiGn Tokens** \n\nYou have 60 seconds to respond!`,
                components: [row],
            })
            .then(async (sent) => {
                bet_message = sent;
            });
    } else {
        await interaction.channel
            .send({
                content: `A game of rock paper scissors has been created! You are betting **for ${tokens} ReiGn Tokens**! \n\nThe winner will take home **${(
                    tokens *
                    2 *
                    0.95
                ).toFixed(
                    0,
                )}** **ReiGn Tokens** \n\n${user} has 60 seconds to respond!`,
                components: [row],
            })
            .then(async (sent) => {
                bet_message = sent;
            });
    }

    // set up collector

    let collector = null;
    if (user == null) {
        collector = interaction.channel.createMessageComponentCollector({
            time: 60000,
            filter: (i) => i.message.id === bet_message.id,
        });
    } else {
        const collectorFilter = async (i) => {
            if (i.message.id === bet_message.id) {
                if (
                    i.user.id === user.id ||
                    i.user.id === interaction.user.id
                ) {
                    return true;
                } else {
                    await i.reply({
                        content: `Only the challenged person is allowed to respond!`,
                        ephemeral: true,
                    });
                }
            } else {
                await i.reply({
                    content: `This interaction is not related to the target!`,
                    ephemeral: true,
                });
            }
        };

        collector = interaction.channel.createMessageComponentCollector({
            filter: collectorFilter,
            time: 60000,
        });
    }
    let choiceArray = [];
    let winner;
    let loser;
    let gameResolved = false;

    collector.on('collect', async (collected) => {
        if (
            collected.customId == 'cancel' &&
            collected.user.id === interaction.user.id
        ) {
            try {
                await collected.reply({
                    content: 'Cancelled the game of rock paper scissors!',
                    ephemeral: true,
                });
                collector.stop();
            } catch (error) {
                console.log('kanker async ' + error);
            }
        }

        if (
            collected.customId == 'cancel' &&
            collected.user.id !== interaction.user.id
        ) {
            try {
                await collected.reply({
                    content:
                        'You are not the rock paper scissors initiator, cannot cancel!',
                    ephemeral: true,
                });
            } catch (error) {
                console.log('kanker async ' + error);
            }
        } else {
            const userXP = await Levels.fetch(
                collected.user.id,
                interaction.guild.id,
            );

            const alreadyInArray = choiceArray.some(
                (obj) => obj.userID === collected.user.id,
            );

            if (
                userXP.xp >= tokens &&
                alreadyInArray === false &&
                choiceArray.length < 2
            ) {
                const choice = {
                    userID: collected.user.id,
                    rps: collected.customId, //rps = rock paper scissors (which one of those the user picked)
                };
                choiceArray.push(choice);

                try {
                    await collected.reply({
                        content: `You've chosen **${collected.customId}**!`,
                        ephemeral: true,
                    });
                } catch (error) {
                    console.log('kanker async ' + error);
                }
            } else {
                try {
                    await collected.reply({
                        content:
                            "You either don't have enough tokens for this, you've already made a choice or someone beat you to it!",
                        ephemeral: true,
                    });
                } catch (error) {
                    console.log('kanker async ' + error);
                }
            }

            if (choiceArray.length === 2 && gameResolved === false) {
                gameResolved = true;
                row.components.forEach((button) => button.setDisabled(true));

                try {
                    await bet_message
                        .edit({
                            content: `A game of rock paper scissors has been created! You are betting for **${tokens} ReiGn Tokens**! \n\nThe winner will take home **${(
                                tokens *
                                2 *
                                0.95
                            ).toFixed(
                                0,
                            )}** **ReiGn Tokens** \n\n You have **60 seconds to respond**!`,
                            components: [row],
                        })
                        .then(async (sent) => {
                            bet_message = sent;
                        });
                } catch (error) {
                    console.log('kanker async ' + error);
                }

                switch (choiceArray[0].rps) {
                    case 'rock':
                        switch (choiceArray[1].rps) {
                            case 'rock':
                                winner = 'tie';
                                break;
                            case 'paper':
                                winner = choiceArray[1];
                                loser = choiceArray[0];
                                break;
                            case 'scissors':
                                winner = choiceArray[0];
                                loser = choiceArray[1];
                                break;
                        }
                        break;

                    case 'paper':
                        switch (choiceArray[1].rps) {
                            case 'rock':
                                winner = choiceArray[0];
                                loser = choiceArray[1];
                                break;
                            case 'paper':
                                winner = 'tie';
                                break;
                            case 'scissors':
                                winner = choiceArray[1];
                                loser = choiceArray[0];
                                break;
                        }
                        break;

                    case 'scissors':
                        switch (choiceArray[1].rps) {
                            case 'rock':
                                winner = choiceArray[1];
                                loser = choiceArray[0];
                                break;
                            case 'paper':
                                winner = choiceArray[0];
                                loser = choiceArray[1];
                                break;
                            case 'scissors':
                                winner = 'tie';
                                break;
                        }
                        break;
                    default:
                        console.log('Something went wrong!');
                }
                if (winner == 'tie') {
                    const player1Member = await interaction.guild.members.fetch(
                        choiceArray[0].userID,
                    );

                    const player2Member = await interaction.guild.members.fetch(
                        choiceArray[1].userID,
                    );

                    await interaction.channel.send({
                        content: `It's a tie! Both ${player1Member.user} and ${player2Member.user} chose ***${choiceArray[0].rps}***.\n\nYour **ReiGn Tokens** have been refunded.\n\nUse */rockpaperscissors* again if you'd like a rematch!`,
                    });
                } else {
                    const winnerMember = await interaction.guild.members.fetch(
                        winner.userID,
                    );

                    const loserMember = await interaction.guild.members.fetch(
                        loser.userID,
                    );

                    await interaction.channel.send({
                        content: `${winnerMember.user} chose ***${
                            winner.rps
                        }*** and ${loserMember.user} chose ***${
                            loser.rps
                        }***.\n\n${winnerMember.user} wins **${Math.round(
                            tokens * 2 * 0.95,
                        )}** **ReiGn Tokens**!`,
                    });

                    await Levels.subtractXp(
                        winnerMember.user.id,
                        interaction.guild.id,
                        tokens,
                    ); //take away original bet amount from winner so the maths works out

                    const hasLeveledUp = await Levels.appendXp(
                        winnerMember.user.id,
                        interaction.guild.id,
                        tokens * 2 * 0.95,
                    );

                    const hasLeveledDown = await Levels.subtractXp(
                        loserMember.user.id,
                        interaction.guild.id,
                        tokens,
                    );

                    if (hasLeveledUp) {
                        try {
                            await xp_roles.improvedLevelUp(
                                interaction.guild,
                                winnerMember.user.id,
                                interaction.client,
                                false,
                                true,
                            );
                        } catch (error) {
                            console.error(error);
                        }
                    }
                    if (hasLeveledDown) {
                        try {
                            xp_roles.improvedLevelUp(
                                interaction.guild,
                                loserMember.user.id,
                                interaction.client,
                                true,
                                true,
                            );
                        } catch (error) {
                            console.error(error);
                        }
                    }
                    const doc = {
                        game: 'rockpaperscissors',
                        starter: interaction.user.id,
                        result: winner.rps,
                        winner: winner.userID,
                        loser: loser.userID,
                        stake: tokens,
                        payout: tokens * 2 * 0.95,
                    };
                    timeout = false;
                    await gambles.insertOne(doc);
                    collector.stop();
                }
            }
        }
    });

    collector.on('end', async () => {
        if (timeout === true) {
            row.components.forEach((button) => button.setDisabled(true));

            bet_message
                .edit({
                    content: `Rock paper scissors ended!`,
                    components: [row],
                })
                .then(async (sent) => {
                    bet_message = sent;
                });
        }
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rockpaperscissors')
        .setDescription('Start a game of rock paper scissors')
        .addIntegerOption((option) =>
            option
                .setName('tokens')
                .setDescription('Amount of tokens you want to stake')
                .setRequired(true)
                .setMinValue(1),
        )
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('Do you want to challenge a specific user?')
                .setRequired(false),
        ),
    execute: rockPaperScissors,
};
