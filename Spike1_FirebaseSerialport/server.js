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
    console.log("\nConnecting to Arduino on " + arduinoCom);
    var port = new SerialPort(arduinoCom, {
        baudRate: 57600,
    });

    port.on('open', function() {
        console.log(" - Connection open. Awaiting firmata details.");
    });

    port.on('error', function(err) {
        process.exit(1);
    });

    var commandDesc = {
        /*StartByte: [Name, IsTerminatedBySpecificByte, MessageLengthOrTerminatorByte, Callback]*/
        0xF9: ["ProtocolVersion", false, 2, function(){}],
        0xF0: ["Sysex", true, 0xF7, function(){}],
        0x90: ["DigitalIOMessage", false, 2, function(){}],
    }

    var dataSoFar = new Buffer(0);
    port.on('data', function(data) {
    try {
        while (data !== null && data.length > 0) {
            dataSoFar = Buffer.concat([dataSoFar, data]);

            var desc = commandDesc[dataSoFar[0]];
            if (desc == undefined) {
                // Unknown message!
                process.exit(1);
            }

            var cut = desc[1] ? dataSoFar.indexOf(desc[2]) : desc[2];
            if (cut < 0 || cut > dataSoFar.length) {
                break;
            }
            cut++;

            desc[3](dataSoFar.slice(0, cut), port);
            data = dataSoFar.slice(cut);
            dataSoFar = new Buffer(0);
        }
        } catch(e) {
        console.log(e);
        }
    });
}
