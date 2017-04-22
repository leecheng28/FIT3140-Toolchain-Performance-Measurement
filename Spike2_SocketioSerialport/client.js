/**
 * FIT3140 - Assignment 3. Team 29. Spike2. 
 *
 * client.js: Client side implementation using Firebase and Johnny-Five. 
 *
 * 1) Client reads data from firebase datbase; 
 * 2) Client calculates response time;
 *
 * Reference: ;
 *
 * @author Li Cheng
 */
 var firebase = require('firebase');
 var publicFirebaseConfig = require('./publicFirebaseConfig.js');
firebase.initializeApp(publicFirebaseConfig);

// Data overflow: once the response time is calculated, the used data is deleted
firebase.database().ref("spike2").on('child_added', function(chi) {
	var value = chi.val();
	console.log("Motion "+ (value.isMotion ? "ON" : "OFF") + " event occurred " + (Date.now() - value.time)  + "ms ago.");
	chi.ref.remove();
});