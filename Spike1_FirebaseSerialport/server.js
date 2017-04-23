var admin = require("firebase-admin");
var moment = require("moment");
var SerialPort = require('serialport');

// Connect to firebase.
admin.initializeApp({
    credential: admin.credential.cert(require("./serviceAccountKey.json")),
    databaseURL: "https://fit3140-team29-a2-c8d2a.firebaseio.com"
});

// Access the firebase database.
var db = admin.database();

// Get references to the areas we care about.
var spikeRef = db.ref("spike1");

// Pick the right arduino to connect to.
console.log("Finding arduinos...");
SerialPort.list(function (err, ports) {
    console.log("Available serial ports as follows:");
    
    // Go through every port and find one which reports as an arduino.
    // Jot down what SerialPort sees so we can get an idea for its support.
    var arduinoCom = null;
    ports.forEach(function(port) {
        console.log(" - " + port.comName + ": " + port.manufacturer);
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

// This function connects to a given arduino device with the firmata firmware
// installed.
function connectToArduino(arduinoCom) {
    // Open the device
    console.log("\nConnecting to Arduino on " + arduinoCom);
    var port = new SerialPort(arduinoCom, {
        baudRate: 57600,
    });
 
    // Let us know when the device is open
    port.on('open', function() {
        // NOTE: Something seems to be buffering the serial input even when
        // the port is not open. So we're gonna flush all that data away. It's
        // a hack to do this in this way, but hope that in this small time
        // span, no important data is sent to us.
        port.flush(function() {
            console.log(" - Connection open. Awaiting firmata details.");

            // Deal with errors.
            port.on('error', function(err) {
                console.log('Error communicating with Arduino: ' + err.message + '. Exiting.');
                process.exit(1);
            })
            
            // These describe the firmata commands we will be receiving.
            var commandDesc = {
                /*StartByte: [Name, IsTerminatedBySpecificByte, MessageLengthOrTerminatorByte, Callback]*/
                0xF9: ["ProtocolVersion", false, 2, onProtocolVersion],
                0xF0: ["Sysex", true, 0xF7, onSysex],
                0x90: ["DigitalIOMessage", false, 2, onDigitalPortData],
            }
            
            // Deal with incoming Firmata messages.
            var dataSoFar = new Buffer(0);
            port.on('data', function(data) {
                try {
                    // While there is data to deal with...
                    while (data !== null && data.length > 0) {
                        // Add the message onto the buffer.
                        dataSoFar = Buffer.concat([dataSoFar, data]);

                        // Get the message descriptor from its first byte.
                        var desc = commandDesc[dataSoFar[0]];
                        if (desc == undefined) {
                            var bytes = ""
                            for (var i = 0; i < dataSoFar.length; i++) {
                                bytes += " " + dataSoFar[i]
                            }

                            // Unknown message!
                            console.log("The data the device is reporting is not valid " +
                                        "firmata data! Please restart the program and " +
                                        "also insure that Firamata is correctly " +
                                        "installed. Got: " + bytes + ". Exiting.");
                            process.exit(1);
                        }

                        // Are we done yet?
                        var cut = desc[1] ? dataSoFar.indexOf(desc[2]) : desc[2];
                        if (cut < 0 || cut >= dataSoFar.length) {
                            break;
                        }
                        cut++;

                        // Callback and repeat loop.
                        desc[3](dataSoFar.slice(0, cut), port);
                        data = dataSoFar.slice(cut);
                        dataSoFar = new Buffer(0);
                    }
                } catch(e) {
                    console.log(e);
                }
            });
        });
    });
}

function onMotionEvent(isMotion) {
    var time = Date.now();
    console.log("Motion is now " + (isMotion ? "ON" : "OFF") + " at time " + moment(time).format('MMMM Do YYYY, h:mm:ss a [(+]SSS[ms)]') + ". Pushing to Firebase.");
    spikeRef.push({
       time: time,
       isMotion: isMotion, 
    });
}

function onProtocolVersion(data) {
    console.log(" - ProtocolVersion received: major=" + data[1] + " minor=" + data[2]);
}

function onSysex(data, port) {
    // Make sure this is the right type of sysex (0x79: query firmware).
    if (data[1] != 0x79) {
        console.log(" - Expecting query firmware sysex. Exiting.");
        process.exit(1);
    }
    
    // What is the name of the firmware reported? Should be something like 
    // StandardFirmata.ino
    var fwName = "";
    for (var i = 4; i < data.length-1; i+=2) {
        fwName += String.fromCharCode(data[i]);
    }
    
    console.log(" - QueryFirmware Sysex received: major=" + data[2] + ", minor=" + data[3] + ", fwName=" + fwName);
    console.log(" - Turning on pin 2 for reads");
    
    // Send a "set mode to input on pin 2" command (0xF4, 2, 0), then send a "enable data reporting" command (0xD0, 1)
    port.write(new Buffer([0xF4, 2, 0, 0xD0, 1]), function (err) {
        if (err !== null) {
            console.log("Error turning on pin 2: " + err.message);
            process.exit(1);
        } else {
            console.log(" - Sent turn on for pin 2. Setup complete. Please generate motion.\n");
        }
    });
}

// Called when a pin changes value.
function onDigitalPortData(data) {
    onMotionEvent((data[1] & 4) != 0);
}
