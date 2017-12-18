var IOTA = require('iota.lib.js');
var iota = new IOTA({
    'provider': 'http://node.lukaseder.de:14265'
});

iota.api.getNodeInfo(console.log);

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';

const dbName = 'mosquitto';

// Use connect method to connect to the server
MongoClient.connect(url, function(err, client) {
  console.log("Connected successfully to MongoDB server");

  const db = client.db(dbName);
  db.listCollections(console.log)

  client.close();
});
