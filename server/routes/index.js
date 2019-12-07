const express = require('express');
const router = express.Router();

const path = require('path');

router.get('/', (req, res) => {
  // res.status(200).json({ message: 'Connected!' });
  res.sendFile(path.join(__dirname + '/../index.html'));
});

router.use('/', require('./voice'));

module.exports = router;
