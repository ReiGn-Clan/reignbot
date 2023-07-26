const { MongoClient } = require('mongodb');
const { mongoUris } = require('./prod_config.json');
const client = new MongoClient(mongoUris[1].recruiterDatabase);
const db = client.db('recruiter');
const invlinks = db.collection('invite_links');

const currentDate = new Date(); // Get the current date

async function Yeet() {
    let difference = await invlinks
        .aggregate([
            {
                $match: {
                    $expr: {
                        $ne: ['$LinkUses', '$MaximumUses'], // filter out documents where LinkUses equals MaximumUses
                    },
                },
            },
            {
                $match: {
                    $expr: {
                        $ne: [0, '$MaximumUses'], // filter out documents where LinkUses equals MaximumUses
                    },
                },
            },
            {
                $match: {
                    $expr: {
                        $lt: [
                            currentDate,
                            {
                                $convert: {
                                    input: '$ExpirationDate',
                                    to: 'date',
                                },
                            },
                        ],
                    },
                },
            },
        ])
        .toArray();

    console.log(difference);
}

Yeet();
