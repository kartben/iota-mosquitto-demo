var Wemo = require('wemo-client');
var wemo = new Wemo();

var MA = require('moving-average');
var ma = MA(60 * 1000); // 1min

const spawn = require('child_process').spawn;

wemo.discover(function (err, deviceInfo) {
    console.log('Wemo Device Found: %j', deviceInfo);

    // Get the client for the found device
    var client = wemo.client(deviceInfo);

    // You definitely want to listen to error events (e.g. device went offline),
    // Node will throw them as an exception if they are left unhandled  
    client.on('error', function (err) {
        console.log('Error: %s', err.code);
    });

    // client.on('insightParams', (binaryState, instantPower, data) => console.log(instantPower + ' mW'))

    setInterval(function () {
        client.getInsightParams((err, binaryState, instantPower, data) => {
            ma.push(Date.now(), parseFloat(instantPower));
            console.log('moving average now is:  ', ma.movingAverage(), ' mW');
            console.log('instant power cons. is: ', instantPower, ' mW')

            spawn('mosquitto_pub', ['-p', '8883', '--cafile', '/Users/kartben/mosquitto_conf_iota/ca.crt', '-u', 'superuser', '-P', 'superpassword', '-t', 'sensor/live', '-m', instantPower]);
            spawn('mosquitto_pub', ['-p', '8883', '--cafile', '/Users/kartben/mosquitto_conf_iota/ca.crt', '-u', 'superuser', '-P', 'superpassword', '-t', 'sensor/1m', '-m', ma.movingAverage()]);
        });
    }, 500);


});