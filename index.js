var ShifterbeltClient = require('shifterbelt-talker');
var Bancroft = require('bancroft');

var async =require('async');

var fs = require('fs');

var envFile = "";

console.log(process.argv);
if (process.argv.length > 2) {
  console.log('load env1');
  envFile = __dirname + '/env1.json';
} else {
  console.log('load env2');
  envFile = __dirname + '/env2.json';
}


// Read env.json file, if it exists, load the id`s and secrets from that
// Note that this is only in the development env
// it is not safe to store id`s in files

if (fs.existsSync(envFile)) {
  var env = JSON.parse(fs.readFileSync(envFile, 'utf-8'));
  async.forEachOf(env, function(value, key, callback) {
    process.env[key] = value;
    callback();
  }, function(err) {
    if (err) {
      console.log(err);
    }
  });
}

var shifterbeltClient = new ShifterbeltClient({
  "url": process.env.URL,
  "applicationId": Number(process.env.APPLICATION_ID),
  "key": process.env.KEY,
  "password": process.env.PASSWORD
});
  
shifterbeltClient.on('connect', function(socket){
	var bancroft = new Bancroft({
	  "port": 2948,
	  "hostname": "localhost"
	});
  console.log("socket connected");
  var canEmit = false;
  var locationEmitter = function(position) {
    if (canEmit) {
	    socket.emit("gps_data", position);
  		//console.log('got new location');
  		//console.dir(position);
    }
    //console.log('cannot emit');
  };
  
  bancroft.on('connect', function (data) {
    console.log('connected', data);

  	bancroft.on('location', function (position) {
  		position.geometries.coordinates.splice(-1);
  		locationEmitter(position);
  	});
  
  	bancroft.on('satellite', function (satellite) {
  	  if (satellite) {
  	    //console.log('got new satellite state');
  	  }
    });
  
  	bancroft.on('disconnect', function (err) {
  		console.log('disconnected');
    });
  });
  
  socket.on('command', function(command) {
    "use strict"
    var commander = {
      yes: function() {
        canEmit = true;
        socket.emit('status', {err:null, value:'on'});
        console.log("Status: On");
      },
    
      no: function() {
        canEmit = false;
        socket.emit('status', {err:null, value:'off'});
        console.log("Status: Off");
      }
    };
    
    if (!commander.hasOwnProperty(command)) {
      socket.emit('status', {err: {error: 1, message: 'bad command: ' + command}, value:null});
      return console.log('bad command: ' + command);
    }
    
    return commander[command]();
    
  });
  
  socket.on('test', function(message) {
    console.log(message);
  })

  socket.on('disconnect', function(){
    console.log("Disconnected!");
  	bancroft.removeListener('location', function(){
		  console.log('remove location listener');
	  });
	  bancroft.removeListener('satellite', function(){
		  console.log('remove satellite listener');
    });
  });
});

