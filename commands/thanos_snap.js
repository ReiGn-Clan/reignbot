const fs = require('node:fs');
const { SlashCommandBuilder } = require('discord.js');
const levelNamesData = fs.readFileSync('./json/levelNames.json', 'utf-8');
const levelOrder = JSON.parse(levelNamesData).names;

async function giveXP(interaction) {
    await interaction.reply({
        content: 'Executing the order',
        ephemeral: true,
    });

    await interaction.channel.send({
        content: '## **Starting the countdown..**',
    });

    let remainingSeconds = 10;

    async function theSnap() {
        let all_members = await interaction.guild.members.fetch();
        all_members.forEach(async function (item) {
            if (!item.user.bot) {
                let current_roles = item._roles;

                const current_role_promises = current_roles.map(
                    async (item) => {
                        return await interaction.guild.roles.fetch(item);
                    },
                );

                const current_role_objects = await Promise.all(
                    current_role_promises,
                );

                const current_role_names = current_role_objects.map(
                    (role) => role.name,
                );

                let current_rank = current_role_names.filter((x) =>
                    levelOrder.includes(x),
                )[0];

                if (!(current_rank === 'Neophyte')) {
                    const role = await interaction.guild.roles.cache.find(
                        (role) => role.name === 'Neophyte',
                    );

                    const previousRole =
                        await interaction.guild.roles.cache.find(
                            (role) => role.name === current_rank,
                        );

                    // Need Nuke codes if u wanna enable this::

                    await item.roles.remove(previousRole);
                    await item.roles.add(role);
                }
            }
        });
    }

    // Function to update the countdown every second
    function updateCountdown() {
        if (remainingSeconds <= 0) {
            interaction.channel
                .send({
                    content: `## **Time is up..**`,
                    files: ['./assets/thanos-infinity.gif'],
                })
                .then(console.log('Countdown finished!'));

            theSnap();
        } else {
            interaction.channel
                .send({
                    content: `## **${remainingSeconds}..**`,
                })
                .then(console.log(`Seconds left: ${remainingSeconds}`));
            remainingSeconds--;
            setTimeout(updateCountdown, 1000);
        }
    }

    // Start the countdown
    updateCountdown();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanossnap')
        .setDescription('Set every user to Neophyte'),
    execute: giveXP,
};
