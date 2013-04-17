var express = require('express'),
  rest = require("./rest"),
  http = require('http'),
  compass = require('node-compass'),
  connections = [],
  path = require('path');

var app = express();

// Configure app
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('foobar'));
  app.use(express.session());
  app.use(app.router);
  app.use(compass());
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// GET request foursquare

var api_key = process.env.foursquare_api || require('konphyg')(__dirname + '/config').all().application.foursquare_api

var options = {
  host: 'api.foursquare.com',
  port: 443,
  path: '/v2/venues/41059b00f964a520850b1fe3?oauth_token='+api_key+'&v=20130327',
  method: 'GET'
};

// Configure Routes

app.get('/', function(req, res) {
  rest.getJSON(options, function(statusCode, result) {
    if (statusCode == 200) {
      res.render('index', {title: "San Francisco International Airport", venue: result.response.venue});
    } else {
      res.send("Foursquare Rate Limit Exceeded", 403);
    }
  });
});

app.get('/events', function(req, res) {
  //  Keep connection alive to send SSE
  if (req.headers.accept && req.headers.accept == 'text/event-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Add connection pointer to array
    connections.push(res);

    // Fix heroku on "close" event handler by checking every 10 seconds
    var t = setInterval(function(){
          try{
              res._session.recv.didClose();
          } catch (x) {}
      }, 10000);

    // Remove connection when disconnected
    res.on('close', function() {
      removeConnection(res);
      console.log("Client disconnected.");
          clearInterval(t);
          t = null;
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Create server

http.createServer(app).listen(app.get('port'), function(){

  // Sends a SSE every 10 seconds
  var intervalID = setInterval(function() {
    broadcast();
  }, 10000);

  console.log("Express server listening on port " + app.get('port'));

});

function broadcast() {
  // Check if active connections are open
  if (connections.length === 0) {
    return;
  }

  // Fetch foursquare data and broadcast SSE
  rest.getJSON(options, function(statusCode, result) {
    if (statusCode == 200) {
      var venue = JSON.stringify(result.response.venue);

      connections.forEach(function (res) {
        constructSSE(res, venue);
      });
    }
  });
}

function constructSSE(res, message) {
  res.write("data: " + message + '\n\n');
}

function removeConnection(res) {
  var i = connections.indexOf(res);
  if (i !== -1) {
    connections.splice(i, 1);
  }
}