const {SlashCommandBuilder} = require('discord.js');
const faceitIntegration = require('../src/modules/faceit_integration');
const {MongoClient} = require('mongodb');
const {mongoUris, faceitDbEnvironment} = require('../dev_config.json');
const Levels = require('discord-xp');
const xp_roles = require('../src/modules/xp_roles.js');

const client = new MongoClient(mongoUris[3].faceitDatabase);
const db = client.db(faceitDbEnvironment);
const collection = db.collection('usernames');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setfaceitname')
        .setDescription('Link your discord and faceit name to receive token awards')
        .addStringOption((option) =>
            option
                .setName('faceitusername')
                .setDescription('Your FaceIt username')
                .setRequired(true)
        ),
        
        async execute (interaction){
            let faceitUsername = interaction.options.getString('faceitusername').toLowerCase();
            let allHubMembers = await faceitIntegration.parseNicknames();
            let discordUsername = interaction.user.username;

            //user not found in hub member array
            if (!allHubMembers.includes(faceitUsername)){
                await interaction.reply(`${faceitUsername} not found in the FaceIt hub!`);
                return;
            }

            //continue
            let hasLeveledUp = await Levels.appendXp(
                interaction.user.id,
                interaction.guild.id,
                5000,
            );
        
            if (hasLeveledUp) {
                try {
                    await xp_roles.improvedLevelUp(
                        interaction.guild,
                        interaction.user.id,
                        interaction.client,
                    );
                } catch (error) {
                    console.error(error); // add error handling for levelUp functio
                }
            }

            
            //no entry exists and the user is in the hub, bongo into mongo
            const dataEntry = {
                discordUsername,
                faceitUsername,
            };
            await collection.insertOne(dataEntry);
            await interaction.reply(`Successfully linked ${discordUsername} (Discord) to ${faceitUsername} (FaceIt)`);
        }    
}