const { MongoClient } = require('mongodb');

const { mongoUri } = require('../../dev_config.json');

let client = null;

function connectToDatabase() {
    console.log('We are here');
    try {
        client = new MongoClient(mongoUri);

        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

function getDbInstance(db_name) {
    console.log('Retrieving DB', db_name);
    if (client == null) {
        console.log('Client is null');
        return;
    }
    const db = client.db(db_name);
    if (db == null) {
        console.log('error retrieving db');
    }
    return db;
}

module.exports = { connectToDatabase, getDbInstance };
