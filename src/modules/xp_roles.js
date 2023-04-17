const fs = require('node:fs');
const Levels = require('discord-xp');

const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8');
const levelNames = JSON.parse(levelNamesData);

async function levelUp(message) {
    let user = await Levels.fetch(message.author.id, message.guild.id);

    let newLevel = user.level;
    let newLevelName = levelNames[newLevel];

    let previousLevelName = levelNames[newLevel - 1];

    console.log(message);

    const member = message.member;
    const role = message.guild.roles.cache.find(
        (role) => role.name === newLevelName,
    );

    if (
        previousLevelName &&
        member.roles.cache.some((role) => role.name == previousLevelName)
    ) {
        const previousRole = member.guild.roles.cache.find(
            (role) => role.name === previousLevelName,
        );
        await member.roles.remove(previousRole);

        if (previousLevelName === newLevelName) {
            message.channel.send(
                `${message.author}, congratulations! You've leveled up to **Level ${user.level}!**`,
            );
        }

        if (previousLevelName != newLevelName) {
            await member.roles.add(role);
            message.channel.send(
                `${message.author}, congratulations! You've leveled up to **Level ${user.level}** and have been awarded the role **${role.name}!**`,
            );
        }
    }
}

module.exports = {
    levelUp: levelUp,
};
