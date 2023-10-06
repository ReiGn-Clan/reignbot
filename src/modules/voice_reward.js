const Levels = require('../utils/syb_xp.js');
const xp_roles = require('../modules/xp_roles.js');
const token_rates = require('../../token_rates.json');

async function faster_reward(guild, disClient, afk_channel) {
    // Loop over channels and get what users are in it
    const voiceChannels = guild.channels.cache.filter((channel) =>
        channel.isVoiceBased(),
    );

    voiceChannels.forEach(async (channel) => {
        if (channel.id == afk_channel) return;
        if (channel.members.size <= 1) return;
        channel.members.forEach(async (user) => {
            if (!user.voice.deaf && !user.voice.mute) {
                const flat_rate = token_rates.voiceFlatRate;
                const multiplier = 0.8 + channel.members.size * 0.1;
                let tokens = flat_rate * multiplier;

                channel.members.map(async (user) => {
                    if (user.voice.selfVideo) {
                        tokens += 5;
                    }
                    let hasLeveledUp = await Levels.appendXp(
                        user.id,
                        guild.id,
                        tokens,
                    ).catch(console.error); // add error handling for appendXp function

                    if (hasLeveledUp) {
                        try {
                            await xp_roles.improvedLevelUp(
                                guild,
                                user.id,
                                disClient,
                            );
                        } catch (error) {
                            console.error(error); // add error handling for levelUp functio
                        }
                    }
                });
            }
        });
    });
}

module.exports = {
    faster_reward,
};
