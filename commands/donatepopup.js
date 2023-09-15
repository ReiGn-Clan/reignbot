const { SlashCommandBuilder } = require('discord.js');
const Levels = require('../src/utils/syb_xp.js');
const xp_roles = require('../src/modules/xp_roles.js');
const { config_to_use } = require('../general_config.json');
const { donateRateLimitDBEnv } = require(`../${config_to_use}`);
const mongo_bongo = require('../src/utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(donateRateLimitDBEnv);

async function createDonatePopup(interaction) {
    const uses = interaction.options.getInteger('uses');
    const xp = interaction.options.getInteger('tokens');

    const taxPercent = 5;
    const maxUses = 5;
    let user = interaction.options.getUser('user');
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

    if (init_userXP.xp <= xp * uses) {
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
        xp * uses,
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

    let usesLeft;
    if (userRateLimit) {
        usesLeft = maxUses - userRateLimit.count - 1;
    } else {
        usesLeft = maxUses - 1;
    }

    let afterTaxReward = Math.floor(xp * ((100 - taxPercent) / 100));
    console.log('xp: ', xp, ' after tax: ', afterTaxReward);

    await interaction.reply({
        content: `${interaction.user} (${usesLeft} donates left) has donated a popup for ${xp} tokens (${afterTaxReward} post-tax) and ${uses} uses!`,
        ephemeral: false,
    });

    await xp_roles.makeDaily(
        interaction.client,
        true,
        afterTaxReward,
        uses,
        taxPercent,
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('donatepopup')
        .setDescription(
            'Create a popup message manually from your own tokens. Popup will be 5% lower than entered value.',
        )
        .addIntegerOption((option) =>
            option
                .setName('tokens')
                .setDescription('How much xp the user gets')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100000),
        )
        .addIntegerOption((option) =>
            option
                .setName('uses')
                .setDescription('The amount of uses the pop up has')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(30),
        ),
    execute: createDonatePopup,
};
