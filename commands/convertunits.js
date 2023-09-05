const { SlashCommandBuilder } = require('discord.js');

async function convertUnits(interaction) {
    

    let source = interaction.options.getString('value');
    let value;

    if(source.includes("'") || source.includes('ft') || source.includes('feet')) {

        //turn to x'y
        source = source.replace(/ft/g, "'");
        source = source.replace(/feet/g, "'");
        
        let trimmed = source.replace(/[^0-9']/g, '');
        let sourceVals = trimmed.split("'");

        value = sourceVals[0] / 3.2808399;
        value += sourceVals[1] / 39.3700787;
        value = value.toFixed(2);
        value += " meters";

    } else {
        //if cm just remove units
        if (source.includes('cm')) {
            source = source.replace(/\D/g, '');

        //if m turn to cm and remove units
        } else if (source.includes('m') || source.includes('meters')) {
            let trimmed = source.replace(/[^0-9.]/g, '');
            source = trimmed * 100;
        }

        let feet = source / 30.48;
        let inches = feet % 1;
        feet = Math.floor(feet);
        inches = inches * 12;
        inches = inches.toFixed(1);

        value = `${feet}'${inches}`;
    }

    interaction.reply({ content: `Converted value: ${value}`, ephemeral: true })

}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convert')
        .setDescription(
            'Convert between metric and imperial',
        ).addStringOption((option) =>
            option
                .setName('value')
                .setDescription('Value to be converted')
                .setRequired(true),
        ),
    execute: convertUnits,
};
