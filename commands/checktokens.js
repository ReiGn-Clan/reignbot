const { SlashCommandBuilder } = require('discord.js');
const Levels = require('discord-xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checktokens')
        .setDescription('Check how much ReiGn Tokens a user has.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to check the ReiGn Tokens of')
                .setRequired(true),
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const member =
            interaction.options.getMember('user') ||
            (await interaction.guild.members.fetch(user.id));
        const name = member.nickname || user.username;

        const userXP = await Levels.fetch(user.id, interaction.guild.id);
        let xpNeeded = await Levels.xpFor(userXP.level + 1);

        if (!userXP) {
            await interaction.reply(`${name} has 0 ReiGn Tokens.`);
        } else {
            await interaction.reply({
                content: `You have **${userXP.xp} ReiGn Tokens and is Level ${
                    userXP.level
                }! They need ${
                    xpNeeded - userXP.xp
                } more ReiGn Tokens to reach Level ${userXP.level + 1}.**`,
                ephemeral: true,
            });
        }
    },
};
