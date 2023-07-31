const {SlashCommandBuilder} = require('discord.js');
const faceitIntegration = require('../src/modules/faceit_integration');
const {MongoClient} = require('mongodb');
const {mongoUris, faceitDbEnvironment} = require('../dev_config.json');

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
                .setDescription('Your faceit username')
                .setRequired(true)
        ),
        
        async execute (interaction){
            await interaction.deferReply();
            let faceitUsername = interaction.options.getString('faceitusername');
            //let allHubMembers = await faceitIntegration.parseNicknames();
            let discordUsername = interaction.user.username;

            /*if (!allHubMembers.includes(faceitUsername)){
                await interaction.followUp(`${faceitUsername} not found in the FaceIt hub!`);
                return;
            }*/

            const existingEntry = await collection.findOne({discordUsername});
            if (existingEntry){
                const updatedEntry = {$set: {faceitUsername}};
                await collection.updateOne({discordUsername}, updatedEntry);
                await interaction.followUp(`Updated ${discordUsername}'s FaceIt username to ${faceitUsername}`);
            }

            if(!existingEntry){
                // If no entry exists, insert a new data entry into the MongoDB collection
                const dataEntry = {
                    discordUsername,
                    faceitUsername,
                };
                await collection.insertOne(dataEntry);
                await interaction.reply(`Successfully linked ${discordUsername} to ${faceitUsername}`);
            }
        }    
}