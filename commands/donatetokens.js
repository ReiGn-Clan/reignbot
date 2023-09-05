const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');
const { config_to_use } = require('../general_config.json');
const { donateRateLimitDBEnv } = require(`../${config_to_use}`);
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(donateRateLimitDBEnv);

async function giveXP(interaction) {
    const maxUses = 5;
    let user = interaction.options.getUser('user');
    let tokens = interaction.options.getInteger('amount');
    const tokensUsesCollection = db.collection('tokens_uses');

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set  the time to the beginning of the day

    const userRateLimit = await tokensUsesCollection.findOne({
        userId: interaction.user.id,
        date: today,
    });

    try {
        if (userRateLimit && userRateLimit.count >= maxUses) {
            const currentTime = new Date();
            const endOfDay = new Date(today);
            endOfDay.setDate(endOfDay.getDate() + 1);
            const timeDifferenceMillis = endOfDay - currentTime;

            const remainingHours = Math.floor(
                (timeDifferenceMillis / 1000 / 60 / 60) % 24,
            );
            const remainingMinutes = Math.floor(
                (timeDifferenceMillis / 1000 / 60) % 60,
            );

            interaction.reply({
                content: `You have reached the daily usage limit for this command. Try again in ${remainingHours} hours ${remainingMinutes} minutes.`,
                ephemeral: true,
            });
            return;
        }

        if (userRateLimit) {
            await tokensUsesCollection.updateOne(
                //If the doc already exist for today, increment it
                { userId: interaction.user.id, date: today },
                {
                    $inc: { count: 1 },
                    $set: { lastUsageTimestamp: new Date() },
                },
            );
        } else {
            await tokensUsesCollection.insertOne({
                //if doc doesn't exist for today, create it
                userId: interaction.user.id,
                date: today,
                count: 1,
                lastUsageTimestamp: new Date(),
            });
        }
    } catch (error) {
        console.error(error);
    }

    if (interaction.user == user) {
        interaction.reply({
            content: 'You cannot donate to yourself!',
            ephemeral: true,
        });
        return;
    }

    // Check if the user donating has enough XP
    const init_userXP = await Levels.fetch(
        interaction.user.id,
        interaction.guild.id,
    );

    if (init_userXP.xp <= tokens) {
        interaction.reply({
            content: 'You do not have enough tokens for this!',
            ephemeral: true,
        });
        return;
    }

    // Remove the tokens from the user donating
    const hasLeveledDown = await Levels.subtractXp(
        interaction.user.id,
        interaction.guild.id,
        tokens,
    );

    if (hasLeveledDown) {
        await xp_roles.improvedLevelUp(
            interaction.guild,
            interaction.user.id,
            interaction.client,
            true,
            true,
        );
    }

    let hasLeveledUp = await Levels.appendXp(
        user.id,
        interaction.guild.id,
        tokens,
    );

    let userTotalXP = await Levels.fetch(user.id, interaction.guild.id, true);

    if (hasLeveledUp) {
        try {
            await xp_roles.improvedLevelUp(
                interaction.guild,
                user.id,
                interaction.client,
                false,
                true,
            );
        } catch (error) {
            console.error(error); // add error handling for levelUp functio
        }
    }

    await interaction.reply({
        content: `${interaction.user} (${
            maxUses - userRateLimit.count - 1
        } uses left) donated ${tokens} ReiGn Tokens to ${user}. They now have ${
            userTotalXP.xp
        } ReiGn Tokens!`,
        ephemeral: false,
    });

    let init_userXP_after = await Levels.fetch(
        interaction.user.id,
        interaction.guild.id,
    );

    while (init_userXP_after.xp == init_userXP.xp) {
        init_userXP_after = await Levels.fetch(
            interaction.user.id,
            interaction.guild.id,
        );
    }

    if (init_userXP_after.level < init_userXP.level) {
        console.log('Deranked');
        xp_roles.improvedLevelUp(
            interaction.guild,
            interaction.user.id,
            interaction.client,
            true,
            true,
        );
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('donatetokens')
        .setDescription('Give a user a specified amount of ReiGn Tokens.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to give ReiGn Tokens to.')
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription('Amount of ReiGn Tokens to give to the user')
                .setMinValue(1)
                .setRequired(true),
        ),
    execute: giveXP,
};
