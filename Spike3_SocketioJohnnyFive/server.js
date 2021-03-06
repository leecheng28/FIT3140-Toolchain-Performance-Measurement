/**
 * FIT3140 - Assignment 3. Team 29. Spike3.
 *
 * server.js: Server side implementation using Socketio and Johnny-Five.
 *
 * 1) Server reads and prints data from motion sensor, with timestamp on the console;
 * 2) Server sends data to client via socketio;
 *
 * @author Li Cheng, Matthew Ready
 */

// Import libraries
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var moment = require("moment");

var five = require('johnny-five');
var socketNames = require('./lib/socket-names.js');
var EventEmitter = require('events').EventEmitter;

// Increase Event Emitter limit manaully, to prevent wanrning of potential memory leak.
require('events').EventEmitter.prototype._maxListeners = 100;

// Setup a basic server state. This is intended to be synchronized between the
// server and the client.
var state = {};

state[socketNames.SOCVAR_MOTION] = false;
state[socketNames.SOCVAR_TIME] = 0;

/**
 * Sends the current server state on the given socket.
 *
 * @param socket The socket to send the server state on.
 */
function emitStateOnSocket(socket) {   
    // Send an event called socketNames.SOCEVENT_SERVER_SETS_STATE with data
    // set to the current state.
    socket.emit(socketNames.SOCEVENT_SERVER_SETS_STATE, state);
}

/**
 * Sends the current server state to all connected clients.
 */
function emitStateOnAllSockets() {
    emitStateOnSocket(io.sockets);
}

// Server listens on local host, port 8000
server.listen(8000);

// Create a Johnny-five board object to communicate with arduino
var board = new five.Board();
board.on("ready", function() {
	var motion = new five.Motion(2);

	motion.on("calibrated", function() {
    	console.log("calibrated");
	});

	// Whenever there is a state change in "detectedMotion" variable, log a message in console.
	motion.on("change", function(data) {
        console.log("Motion is now " + (data.detectedMotion ? "ON" : "OFF") + " at time " + moment(data.timestamp).format('MMMM Do YYYY, h:mm:ss a [(+]SSS[ms)]') + ". Pushing to Firebase.");

		// update server state variables
		state[socketNames.SOCVAR_MOTION] = data.detectedMotion;
		state[socketNames.SOCVAR_TIME] = data.timestamp;

		// Send to all connected clients
		emitStateOnAllSockets();
	});
});




