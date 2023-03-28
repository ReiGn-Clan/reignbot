const {SlashCommandBuilder} = require('discord.js');
const Levels = require('discord-xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkleaderboard')
        .setDescription('Check the top 10 on the leaderboard'),
    async execute(interaction){
        const limit = interaction.options.getInteger('limit') || 10;
        const leaderboard = await Levels.fetchLeaderboard(interaction.guild.id, limit);
        const memberPromises = leaderboard.map(async (user, index) => {
            const member = await interaction.guild.members.fetch(user.userID);
            return `${index + 1}. ${member.nickname ?? member.user.username} - Level ${user.level} (${user.xp} XP)`;
        });
        const leaderboardData = await Promise.all(memberPromises);
        await interaction.reply(`**Leaderboard: **\n${leaderboardData.join('\n')}`);
    }
};