'use strict';

const express = require('express'),
      router = express.Router(),
      Metrics = require('./util/metrics/metrics');

module.exports = function(app) {
  //metrics routing goes here
  new Metrics(router,app).addRoutes();

  router.ws('/', function(ws, req) {
    /*ws.on('message', function(msg) {
      console.log(msg);
    });*/
  });

  router.get('/oauth/v1', (req, res) => res.json({msg:'oauth response'}));
  router.get('/public/v1', (req, res) => res.json({msg:'public response'}));

  router.use('/rest/v1', require('./rest/v1/routes'));
  router.use('/api/v1', require('./rest/v1/routes'));

  return router;
}