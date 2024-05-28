const mongo = require('mongodb');
const { config_to_use } = require('../general_config.json');
const config = require(`../${config_to_use}`);

const uri = config.mongoUri;

async function resetRanks() {
    // Get the MongoDB client
    const MongoClient = mongo.MongoClient;

    // connect to mongo
    const client = new MongoClient(uri, {});
    
    await client.connect();
    //select db and collection
    const database = client.db(config.xpDbEnvironment);
    //select collection
    const collection = database.collection('levels');

    // Update every document in the collection
    const result = await collection.updateMany(
        {}, // Filter (empty to match all documents)
        { $set: { rankValue: 0 } } // Update operation
    );

    console.log(`Updated ${result.modifiedCount} documents.`);
}

resetRanks().catch(console.error);