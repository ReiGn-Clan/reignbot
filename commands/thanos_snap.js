const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
const roles = require('../json/levelNames.json');
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const xp_roles = require('../src/modules/xp_roles.js');

const db = mongo_bongo.getDbInstance('xpDatabase');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function thanosSnap(interaction) {
    const guild = interaction.guild;
    const members = await guild.members.fetch();
    const neophyteRole = guild.roles.cache.find(
        (role) => role.name === 'Neophyte',
    );
    const loyalMemberRole = guild.roles.cache.find(
        (role) => role.name === 'Loyal Member',
    );

    const roleNames = roles.ranges.map((range) => range.value);

    for (const [id, member] of members) {
        await sleep(350); // to avoid rate limit
        //fetch member obj
        const memberObj = await guild.members.fetch(id);
        for (const roleName of roleNames) {
            const hasRole = memberObj.roles.cache.some(role => role.name === roleName);
            if (roleName !== 'Neophyte' && hasRole) {
                await memberObj.roles.remove(roleName);
                await memberObj.roles.add(neophyteRole);
                console.log(`Removed ${roleName} from ${memberObj.user.username}. Set to Neophyte.`);
            }
        }
        await memberObj.roles.add(loyalMemberRole);

        console.log(`Added Loyal Member to ${member.user.username}.`);
        let userTotalXP = await Levels.fetch(member.id, guild.id);
        let hasLevelDown = await Levels.setXp(member.id, guild.id, 1);

        if (hasLevelDown) {
            try {
                await xp_roles.improvedLevelUp(
                    guild,
                    member.id,
                    interaction.client,
                    true,
                    false,
                );
                console.log(`Set ${member.user.username}'s XP to 0.`);
            } catch (error) {
                console.error(error);
            }
        }

        const collection = db.collection('boosters');
        const isBoosting = memberObj.roles.cache.some(
            (role) => role.id === '1089665914129105066',
        );

        if (isBoosting) {
            console.log(
                `${member.user.username} is boosting the server, adding 10000 Tokens.`,
            );
            let haslvlup = await Levels.appendXp(member.id, guild.id, 10000);

            if (haslvlup) {
                try {
                    await xp_roles.improvedLevelUp(
                        guild,
                        member.id,
                        interaction.client,
                        false,
                        false,
                    );
                } catch (error) {
                    console.error(error);
                }
            }

            await collection.insertOne({
                user_id: member.id,
                awarded: true,
            });
        } else {
            console.log(`${member.user.username} is not boosting the server.`);
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanossnap')
        .setDescription('Set every user to Neophyte'),
    execute: thanosSnap,
};
