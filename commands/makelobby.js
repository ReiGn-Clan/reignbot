const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const matchmaking = require('./src/modules/matchmaking_system.js');

async function makelobby(interaction){

    //create a lobby object and fill it with information to pass along to creator function
    let lobby = {};

    const member = interaction.user.id; 
    lobby.creatorName = member.nickname ?? member.user.username;

    lobby.gameName = gameName;
    lobby.freeSpaces = freeSpaces;
    lobby.rank = rank; 

    await matchmaking.createLobby(lobby, interaction);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('makelobby')
        .setDescription('Make a new lobby.')
        .addStringOption((gameName) =>{
            gameName.setName('Game')
                setDescription('The game to make a lobby for.')
                setRequired(true)
        })

        .addStringOption((freeSpaces) =>{
            freeSpaces.setName('Free spaces')
                setDescription('The amount of free spaces in the lobby.')
                setRequired('true')
        })

        .addStringOption((rank) =>{
            rank.setName('Rank')
                .setDescription('Your rank (Type unranked if N/A)')
                .setRequired('true')
        }),
    execute: makelobby
};