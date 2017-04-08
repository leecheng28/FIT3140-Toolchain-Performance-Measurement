var SerialPort = require('serialport');
// Pick the right arduino to connect to.
console.log("Finding arduinos...");
SerialPort.list(function (err, ports) {
    console.log("Available serial ports as follows:");

    var arduinoCom = null;
    ports.forEach(function(port) {
        console.log(port.comName + ": " + port.manufacturer);
        if (("" + port.manufacturer).indexOf("Arduino") !== -1) {
            if (arduinoCom != null) {
                console.log("More than one arduino detected");
            }
            arduinoCom = port.comName;
        }
    });

    if (arduinoCom == null) {
        console.log("Unable to find suitable arduino to connect to. Exiting.");
        process.exit(1);
    } else {
        connectToArduino(arduinoCom);
    }
});

function connectToArduino(arduinoCom) {
    console.log("Connect to: " + arduinoCom);
}
