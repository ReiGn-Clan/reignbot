const {SlashCommandBuilder} = require('discord.js');
const faceitIntegration = require('../src/modules/faceit_integration');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setfaceitname')
        .setDescription('Link your discord and faceit name to receive token awards')
        .addStringOption((option) =>
            option
                .setName('faceit username')
                .setDescription('Your faceit username')
                .setRequired(true)
        ),
        
        async execute (interaction){
            let user = interaction.options.getUser('user');
            let member = 
                interaction.options.getMember('user') ||
                (await interaction.guild.members.fetch(user.id));
            let name = member.nickname || user.username;

            let faceitUsername = interaction.options.getString('faceit username');
            let allHubMembers = await faceitIntegration.parseNicknames();

            if (allHubMembers.includes(faceitUsername)) {
                console.log('Success!');
            }else{
                console.log('Fail!');
            }
    }
}