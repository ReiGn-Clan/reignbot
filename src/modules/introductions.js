const { config_to_use } = require('../../general_config.json');
const Levels = require('../utils/syb_xp.js');
const {xpDbEnvironment} = require(`../../${config_to_use}`);
const mongo_bongo = require('../utils/mongo_bongo.js');
const db = mongo_bongo.getDbInstance(xpDbEnvironment);

async function getForm(interaction, form){
    console.log(interaction.user.id, form)
    return interaction, form;
}

module.exports = {
    getForm,
}