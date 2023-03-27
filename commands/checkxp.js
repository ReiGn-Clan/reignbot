const {SlashCommandBuilder} = require('discord.js');
const Levels = require('discord-xp');
const mongo_uri = `mongodb+srv://admin:0mJPeNCsVKfjJ80n@reignbot.bcvxwha.mongodb.net/xpDatabase`; //set uri for mongoDB
Levels.setURL(mongo_uri); //connect to mongoDB

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkxp')
        .setDescription('Check how much XP you have.'),
    async execute(interaction) {
        const userXP = await Levels.fetch(interaction.user.id, interaction.guild.id); //fetch the discord-xp library, and check how much xp in this server the user has
        if (!userXP) {
            await interaction.reply (`${interaction.user.toString()} You have 0 xp.`); // if no xp, tell them 0xp.
        }
        await interaction.reply(`${interaction.user.toString()}, you currently have **${userXP.xp}XP!**`); //tag the user and return how much xp they have
    },
}; 