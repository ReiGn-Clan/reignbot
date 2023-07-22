const { MongoClient } = require('mongodb');
const { mongoUris, discordAPIBotStuff } = require('../../prod_config.json');
const client = new MongoClient(mongoUris[2].gamblingDatabase);
const db = client.db('gambling');

async function makeGamble(disClient, member, channelID, game, XP) {
    // Channel to send it in

    const channel = await disClient.channels.fetch(channelID);
    const gambles = await db.collection('gambles');

    // Sending the message
    channel
        .send({
            content: `A bet has been started for **${XP}** xp \n The game is ${game} \n Respond to this message to answer the challenge!`,
            fetchReply: true,
        })
        .then(async (sent) => {
            sent.react('1099386036133560391');
            let id_ = sent.id;
            console.log(id_);
            const doc = {
                _id: id_,
                maxUses: 1,
                uses: 0,
                xp: XP,
                game: game,
                channelID: channelID,
                users: [member.id],
            };
            await gambles.insertOne(doc);
        });
}

async function rewardGamble(reaction, user, disClient, messageDOC) {
    // Avoid the bot reaction
    if (user.id == discordAPIBotStuff[2].botUserID) return;

    const gambles = await db.collection('gambles');
    const guild = await disClient.guilds.fetch(reaction.message.guildId);

    if (reaction.emoji.id !== '1099386036133560391') {
        console.log('Wrong emoji');
        await reaction.users.remove(user.id);
        return;
    }

    if (messageDOC.users.includes(user.id)) return;

    // Channel and message that is the daily
    const channelDaily = await disClient.channels.fetch(messageDOC.channelID);
    const messageDaily = await channelDaily.messages.fetch(messageDOC._id);

    if (
        (messageDOC.uses + 1 == messageDOC.maxUses) |
        (messageDOC.uses >= messageDOC.maxUses)
    ) {
        await gambles.deleteOne({ _id: reaction.message.id });

        messageDaily.delete().catch(console.error);
    } else {
        messageDOC.users.push(user.id);
        await gambles.updateOne(
            { _id: reaction.message.id },
            { $inc: { uses: 1 }, $set: { users: messageDOC.users } },
        );
        messageDaily.edit({
            content: 'Yeet',
        });
    }

    channelDaily.send(
        `${user} has accepted a game of ${messageDOC.game} for ${messageDOC.XP}`,
    );

    /*
    if (hasLeveledUp) {
        try {
            await improvedLevelUp(guild, user.id, disClient);
        } catch (error) {
            console.error(error); // add error handling for levelUp functio
        }
    }
    */
}

module.exports = {
    makeGamble,
    rewardGamble,
};
