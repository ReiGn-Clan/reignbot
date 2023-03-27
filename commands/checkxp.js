const {SlashCommandBuilder} = require('discord.js');
const Levels = require('discord-xp');
const mongo_uri = `mongodb+srv://admin:0mJPeNCsVKfjJ80n@reignbot.bcvxwha.mongodb.net/xpDatabase`; //set uri for mongoDB
Levels.setURL(mongo_uri); //connect to mongoDB

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkxp')
        .setDescription('Check how much XP you have.'),
    async execute(interaction) {
        const userXP = await Levels.fetch(interaction.user.id, interaction.guild.id);
        if (!userXP) {
            await interaction.reply (`${interaction.user.toString()} You have 0 xp.`);
        }
        await interaction.reply(`${interaction.user.toString()}, you currently have **${userXP.xp}XP!**`);
    },
}; 