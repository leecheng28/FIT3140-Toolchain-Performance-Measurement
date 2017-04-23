/**
 * FIT3140 - Assignment 3. Team 29. Spike3.
 *
 * server.js: Server side implementation using Socketio and Johnny-Five.
 *
 * 1) Client reads data from Socketio; 
 * 2) Client calculates response time;
 *
 * @author Li Cheng, Matthew Ready
 */

// import libraries
var socketNames = require('./lib/socket-names.js');

// connect to the host and port number where server starts
var socket = require('socket.io-client')('http://localhost:8000');

// clients start listening from server, and calculate response time
socket.on('connect', function() {
	socket.on(socketNames.SOCEVENT_SERVER_SETS_STATE, function(data) {
		console.log("Motion " + (data[socketNames.SOCVAR_MOTION] ? "ON" : "OFF") + " event occurred " 
		+ (Date.now() - data[socketNames.SOCVAR_TIME]) + "ms ago.");
	});	
});

