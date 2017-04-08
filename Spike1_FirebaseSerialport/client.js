var firebase = require('firebase');
var publicFirebaseConfig = require('./publicFirebaseConfig.js');
firebase.initializeApp(publicFirebaseConfig);
firebase.database().ref("spike1").on('child_added', function (c) { 
    var val = c.val();
    console.log("Motion "+ (val.isMotion ? "ON" : "OFF") + " event occurred " + (Date.now() - val.time)  + "ms ago.");
    c.ref.remove()
});
