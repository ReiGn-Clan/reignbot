const { SlashCommandBuilder } = require('discord.js');
const Levels = require('discord-xp');

//Test

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkxp')
    .setDescription('Check how much XP a user has.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to check the XP of')
        .setRequired(true),
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member =
      interaction.options.getMember('user') ||
      (await interaction.guild.members.fetch(user.id));
    const name = member.nickname || user.username;

    const userXP = await Levels.fetch(user.id, interaction.guild.id);

    if (!userXP) {
      await interaction.reply(`${name} has 0 XP.`);
    } else {
      await interaction.reply(`${name} has **${userXP.xp} XP!**`);
    }
  },
};
