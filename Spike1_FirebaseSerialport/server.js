var admin = require("firebase-admin");
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
        0xF9: ["ProtocolVersion", false, 2, onProtocolVersion],
        0xF0: ["Sysex", true, 0xF7, onSysex],
        0x90: ["DigitalIOMessage", false, 2, onDigitalPortData],
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

function onMotionEvent(isMotion) {
    var time = Date.now();
    console.log("Motion is now " + (isMotion ? "ON" : "OFF") + " at time " + time + ". Pushing to Firebase.");
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
