const {SlashCommandBuilder} = require('discord.js');
const Levels = require('discord-xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkleaderboard')
        .setDescription('Check the top 10 on the leaderboard'),
    async execute(interaction){
        const limit = interaction.options.getInteger('limit') || 10; //limit for how many users can be returned in the leaderboard
        const leaderboard = await Levels.fetchLeaderboard(interaction.guild.id, limit); //retrieve leaderboard from db

        //this arrow function builds and formats an obj for each user, as they are unformatted in the "leaderboard" variable
        const memberPromises = leaderboard.map(async (user, index) => {
            const member = await interaction.guild.members.fetch(user.userID);
            return `${index + 1}. ${member.nickname ?? member.user.username} - Level ${user.level} (${user.xp} XP)`;
        });
        //wait to make sure that all users/user properties are retrieved, then assign each user obj to "leaderboardData"
        const leaderboardData = await Promise.all(memberPromises);

        //post the message of the leaderboard, joining each individual user obj from "leaderboardData" into one message
        await interaction.reply(`**Leaderboard: **\n${leaderboardData.join('\n')}`);
    }
};