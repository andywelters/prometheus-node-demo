'use strict';

const express = require('express'),
      helmet = require('helmet'),
      cors = require('cors'),
      qs = require('qs'),
      app = express(),
      server = require('http').createServer(app),
      expressWs = require('express-ws')(app, server),
      PORT = 9200;

// Modify default query string parsing - must be set before any app.use() call due to an express bug
app.set('query parser', function(str) {
  return qs.parse(str, {
    strictNullHandling: true
  });
});

// app.use
app.use(cors());
app.use(helmet());

// Main route entry point
app.use('/', require('./advanced-routes')(app));

// WS ping/pong
const heartbeat = ws => {
  ws.isAlive = true;
};

expressWs.getWss().on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', heartbeat.bind(null, ws));
});

const interval = setInterval(() => {
  expressWs.getWss().clients.forEach(ws => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(function noop() {});
  });
}, 30000);

app.wsServer = expressWs.getWss();

server.listen(PORT, '0.0.0.0', () => console.log('App started on port', PORT));;

module.exports = app;