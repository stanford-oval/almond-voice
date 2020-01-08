const express = require('express');
const router = express.Router();

const path = require('path');

router.get('/', (req, res) => {
  res.status(200).json({ message: 'Connected!' });
});

router.use('/', require('./voice'));

module.exports = router;
