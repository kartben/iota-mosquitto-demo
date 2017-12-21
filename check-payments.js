/*********************************************************************
* Copyright (c) 2017 Benjamin Cabé
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/
var moment = require('moment');

var IOTA = require('iota.lib.js');
var iota = new IOTA({
    'provider': 'http://node.lukaseder.de:14265'
});

iota.api.getNodeInfo((info) => console.log("Connected successfully to IOTA node"));

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const dbName = 'mosquitto';

const ACCESS_PRICE = 500   // # of iotas required to get full access to the telemetry feed for HOURS hours
const HOURS = 6            // how many hours ACCESS_PRICE will give you access to 

// The IOTA address where funds will be deposited
const DEPOSIT_ADDRESS = 'XBXMCRYITBINKG9OSEUCFSEIGXUGBUE9KWGWTUCLOADTHQTH9LYSQLTGZ9ESJWDONDBVGBAYMLCYVB9ODFLAGMHVLD'

MongoClient.connect(url, function (err, client) {
    console.log("Connected successfully to MongoDB server");

    const db = client.db(dbName);
    const users = db.collection('users');

    setInterval(() => {
        console.log('\nChecking deposits on IOTA address %s', DEPOSIT_ADDRESS);

        iota.api.findTransactionObjects({ 'addresses': [DEPOSIT_ADDRESS] }, (err, transactions) => {
            console.log(' --> %d transactions found for address ', transactions.length, DEPOSIT_ADDRESS)

            iota.api.getLatestInclusion(
                transactions.map(t => t.hash),
                (err, states) => {
                    states.forEach((state, index) => {
                        transactions[index].state = state;
                    })

                    // Only keep those transactions with enough funding, that happened in the last HOURS hours, and that are confirmed
                    var validTransactions = transactions.filter(
                        t =>
                            t.value >= ACCESS_PRICE
                            && moment(t.timestamp * 1000).isAfter(moment().subtract(HOURS, 'hour'))
                            && t.state == true // for testing purposes, and because IOTA confirmations can take a 
                                               // long time, you may want not to wait for actual confirmation of 
                                               // the transaction before granting access to the user. Now of course
                                               // that is pretty risky as the payment might be a double spend and 
                                               // may never get confirmed. 
                    )
                    // console.log(' --> %d valid transactions found', validTransactions.length, DEPOSIT_ADDRESS)

                    validTransactions.forEach(transaction => {
                        console.log(' --> Found a %s transaction (%s…) for %d iotas issued %s [%s]', (transaction.state ? 'confirmed' : 'pending'), transaction.hash.substr(0, 8), transaction.value, moment(transaction.timestamp * 1000).fromNow(), moment(transaction.timestamp * 1000).toLocaleString());

                        // The transaction corresponds to an MQTT client that should be granted full access to the telemetry feed.
                        // The username is in the transaction message (message should be in the form of: '{"username": "{username}"}')
                        try {
                            const message = JSON.parse(iota.utils.extractJson([transaction]));

                            if (message && message.hasOwnProperty("username")) {
                                // Update the corresponding user to grant him access to 'sensor/#' (i.e live stream)
                                users.findOneAndUpdate({ 'username': message.username }, {
                                    $set:
                                        {
                                            topics: {
                                                "sensor/#": "r"
                                            }
                                        }
                                }).then(result => {
                                    console.log(' --> User %s successfully granted access', result.value.username)
                                })
                            }
                            else {
                                console.log(' --> Transaction (%s…) is valid but did not contain a username.', transaction.hash.substr(0, 8));

                            }
                        } catch (e) {
                            console.log('Error when processing transaction (%s…)', transaction.hash.substr(0, 8))
                        }
                    });

                    // for all the users for whom we didn't find a valid payment, revoke access
                    // TODO
                })
        })

    }, 5 * 1000);


    //    TODO
    //    client.close(); 
});

