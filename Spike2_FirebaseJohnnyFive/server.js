/**
 * FIT3140 - Assignment 3. Team 29. Spike2. 
 *
 * server.js: Server side implementation using Firebase and Johnny-Five. 
 *
 * 1) Server reads and prints data from motion sensor, with timestamp on the console;
 * 2) Server sends data to firebase database;
 *
 * @author Li Cheng
 */

// Import libraries
var admin = require('firebase-admin');
var five = require('johnny-five');
var moment = require("moment");

// Connect to firebase
admin.initializeApp({
	credential: admin.credential.cert(require("./serviceAccountKey.json")),
    databaseURL: "https://fit3140-team29-a2-c8d2a.firebaseio.com"
});

// Access the firebase database
var db = admin.database();

// Get references to the areas we care about.
var spikeRef = db.ref("spike2");

// Create a Johnny-five board object to communicate with arduino
var board = new five.Board();
var time = Date.now();

board.on("ready", function() {
	var motion = new five.Motion(2);

	motion.on("calibrated", function() {
    	console.log("calibrated");
	});

	// whenever there is a state change in "detectedMotion" variable
	motion.on("change", function(data) {
	var isMotion = null;
        console.log("Motion is now " + (data.detectedMotion ? "ON" : "OFF") + " at time " + moment(data.timestamp).format('MMMM Do YYYY, h:mm:ss a [(+]SSS[ms)]') + ". Pushing to Firebase.");
		spikeRef.push({
			time: data.timestamp,
			isMotion: data.detectedMotion,
		});
	});
});



