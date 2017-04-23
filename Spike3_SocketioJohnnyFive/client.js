/**
 * FIT3140 - Assignment 3. Team 29. Spike3.
 *
 * server.js: Server side implementation using Socketio and Johnny-Five.
 *
 * 1) Server reads and prints data from motion sensor, with timestamp on the console;
 * 2) Server sends data to client via socketio;
 *
 * @author Li Cheng
 */

 // import libraries
 var socketNames = require('./lib/socket-names.js');

var socket = require('socket.io-client')('http://localhost:8000');
socket.on('connect', function() {
	socket.on(socketNames.SOCEVENT_SERVER_SETS_STATE, function(data) {
		console.log("Motion "+ (data[socketNames.SOCVAR_MOTION] ? "ON" : "OFF") + " at timestamp " + data[socketNames.SOCVAR_TIME]);
	});	
	//console.log('client connects to server!');
});

