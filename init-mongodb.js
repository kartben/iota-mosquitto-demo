/*********************************************************************
* Copyright (c) 2017 Benjamin Cabé
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/
const crypto = require('crypto');
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const dbName = 'mosquitto';

const ITERATIONS = 100000;
const keyLen = 24;
var saltLen = 12;

var john = { username: 'johndoe', password: 'password'}
var su = { username: 'superuser', password: 'superpassword'}

MongoClient.connect(url, function (err, client) {
    console.log("Connected successfully to MongoDB server");

    const db = client.db(dbName);
    const users = db.collection('users');

    john.salt = crypto.randomBytes(saltLen).toString('base64');
    john.key = crypto.pbkdf2Sync(john.password, john.salt, ITERATIONS, 64, 'sha256')

    su.salt = crypto.randomBytes(saltLen).toString('base64');
    su.key = crypto.pbkdf2Sync(su.password, su.salt, ITERATIONS, 64, 'sha256')

    users.insertMany(
        [
            {
                "username": john.username,
                "password": "PBKDF2$sha256" + '$' + ITERATIONS + '$' + john.salt + '$' + john.key.toString('base64'),
                "superuser": false,
                "topics": {
                    "sensor/#": "r"
                }
            },
            {
                "username": su.username,
                "password": "PBKDF2$sha256" + '$' + ITERATIONS + '$' + su.salt + '$' + su.key.toString('base64'),
                "superuser": true
            }
        ], (err, result) => {
            if(err) throw err;
            console.log('%d user(s) successfully inserted', result.insertedCount);
            client.close();
        } )

});