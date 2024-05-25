const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
const roles = require('../json/levelNames.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function thanosSnap(interaction) {
    const guild = interaction.guild;
    const members = await guild.members.fetch();
    const neophyteRole = guild.roles.cache.find(role => role.name === 'Neophyte');

    const roleNames = roles.ranges.map(range => range.value);

    members.forEach(async (member) => {
        await sleep(350); // to avoid rate limit
        roleNames.forEach(async (roleName) => {
            if (roleName !== 'Neophyte' && await member.roles.cache.has(roleName)) {
                await member.roles.remove(roleName);
                await member.roles.add(neophyteRole);
                console.log(`Removed ${roleName} from ${member.user.username}. Set to Neophyte.`);
            }
        });
        await Levels.setXp(member.id, guild.id, 0);
        console.log(`Set ${member.user.username}'s XP to 0.`);
    });

    return interaction.reply('Perfectly balanced, as all things should be.');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanossnap')
        .setDescription('Set every user to Neophyte'),
    execute: thanosSnap,
};
