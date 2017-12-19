var moment = require('moment');

var IOTA = require('iota.lib.js');
var iota = new IOTA({
    //    'provider': 'http://node.lukaseder.de:14265'
    'provider': 'http://localhost:14265'
});

iota.api.getNodeInfo((info) => console.log("Connected successfuly to IOTA node"));

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const dbName = 'mosquitto';

// Use connect method to connect to the server
MongoClient.connect(url, function (err, client) {
    console.log("Connected successfully to MongoDB server");

    const db = client.db(dbName);
    const users = db.collection('users');

    iota.api.findTransactionObjects({ 'addresses': ['OCWKSGTIGWXAAPRQQIJQXOZSYETVJFMWCIUNOWROXKFFSINCNLZCYATXTCZJAMIH9SCQVKNAINLSR9PKZUGSMDBKVW'] }, (err, transactions) => {
        // transactions.forEach(transaction => {
        //     console.log(transaction.hash, transaction.tag);
        // });

        iota.api.getLatestInclusion(
            transactions.map(t => t.hash),
            (err, states) => {
                states.forEach((state, index) => {
                    transactions[index].state = state;
                })

                transactions.filter(t => t.value > 10 && t.state == true && moment(t.timestamp * 1000).isAfter(moment().subtract(20, 'hour'))).forEach(transaction => {
                    // The transaction corresponds to an MQTT client that should be granted full access to the telemetry feed.
                    // The username is in the transaction message
                    transaction.signatureMessageFragment = iota.utils.toTrytes('{username: "c1"}'); // HACK
                    console.log(transaction)
                    const username = eval(iota.utils.fromTrytes(transaction.signatureMessageFragment));

                    users.findOneAndUpdate({ 'username': username }, {
                        $set:
                            {
                                topics: {
                                    "sensor/#": "r"
                                }
                            }
                    }).then(result => {
                        console.log('User %s successfully granted access', result.value.username)
                    })

                    //                console.log(transaction.hash, transaction.tag, transaction.state, transaction.value, moment(transaction.timestamp * 1000));
                    //                console.log(transaction.signatureMessageFragment);

                });
            })
    })

    //    TODO
    //    client.close(); 
});

