/*********************************************************************
* Copyright (c) 2017 Benjamin Cabé
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/
var Wemo = require('wemo-client');
var wemo = new Wemo();

var MA = require('moving-average');
var ma = MA(60 * 1000); // 1min

const spawn = require('child_process').spawn;

wemo.discover(function (err, deviceInfo) {
    console.log('Wemo Device Found: %j', deviceInfo.serialNumber);

    // Get the client for the found device
    var client = wemo.client(deviceInfo);

    client.on('error', function (err) {
        console.log('Error: %s', err.code);
    });

    setInterval(function () {
        client.getInsightParams((err, binaryState, instantPower, data) => {
            ma.push(Date.now(), parseFloat(instantPower));
            console.log('moving average now is:  ', ma.movingAverage(), ' mW');
            console.log('instant power cons. is: ', instantPower, ' mW')

            // we use mosquitto_pub to publish as the broker is setup for TLS-PSK based authentication, which is not supported in Node.js

            // publish the instant power consumption on 'sensor/live'
            spawn('mosquitto_pub', ['-p', '8883', '--cafile', __dirname + '/mosquitto_conf/ca.crt', '-u', 'superuser', '-P', 'superpassword', '-t', 'sensor/live', '-m', instantPower]);
            // publish 1min moving average of the power consumption on 'sensor/1m'
            spawn('mosquitto_pub', ['-p', '8883', '--cafile',
                __dirname + '/mosquitto_conf/ca.crt', '-u', 'superuser', '-P', 'superpassword', '-t', 'sensor/1m', '-m', ma.movingAverage()]);
        });
    }, 500);


});