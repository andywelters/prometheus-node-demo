'use strict';

const express = require('express'),
      router = express.Router();

router.get('/some-resource/:id', (req, res) => {
  let id = req.params.id;
  let send = '';

  //http status code request
  if(id >= 200 && id <= 599) {
    res.status(id);
    if(id == 301) {
      res.location('/hello');
    }
    else if(id == 404) {
      send = 'NO';
    }
    else if(id == 500) {
      send ='Internal Server Error';
    }
    res.send(send);
  }
  else {
    setTimeout(() => {
      res.json({id: id, msg:'rest response'});
    }, 500);
  }
});
router.delete('/some-resource/:id', (req, res) => {
  let id = req.params.id;
  setTimeout(() => {
    res.json({id: id, msg:'rest deleted'});
  }, 300);
});
router.post('/some-resource/:id', (req, res) => {
  res.json(req.body);
});
router.patch('/some-resource/:id', (req, res) => {
  res.json(req.body);
});

module.exports = router;