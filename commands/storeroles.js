const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8');
const levelOrder = JSON.parse(levelNamesData).names;
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const { config_to_use } = require('../general_config.json');
const { xpDbEnvironment } = require(`../${config_to_use}`);
const db = mongo_bongo.getDbInstance(xpDbEnvironment);

async function saveRoles(interaction) {
    const collection = db.collection('levels');
    //get all users
    let all_members = await interaction.guild.members.fetch();

    all_members.forEach(function (item, key) {
        if (item.user.bot) {
            all_members.delete(key);
        }
    });

    //for each user
    all_members.forEach(async (member) => {
        //get rank role
        let current_roles = member._roles;

        const current_role_promises = current_roles.map(async (item) => {
            return await interaction.guild.roles.fetch(item);
        });

        const current_role_objects = await Promise.all(current_role_promises);

        const current_role_names = current_role_objects.map(
            (role) => role.name,
        );

        let current_rank = current_role_names.filter((x) =>
            levelOrder.includes(x),
        )[0];

        //get db user
        const user = await collection.findOne({
            userID: member.user.id,
            guildID: interaction.guild.id,
        });
        if (user == null) {
            console.log('Could not find user with id ', member.user.id);
        } else {
            user.rank = current_rank;
            user.rankValue = levelOrder.indexOf(current_rank);

            console.log('User with rank values', JSON.stringify(user));

            //update db user
            await collection
                .updateOne({ _id: user._id }, { $set: user })
                .catch((e) => console.log(`Failed to set rank, error`, e));
        }
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('storeroles')
        .setDescription(
            'Go through all users and put their current rank in the DB',
        ),
    execute: saveRoles,
};
