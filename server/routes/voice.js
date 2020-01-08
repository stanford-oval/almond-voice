const csr = require('../../build/lib/csr')
const fs = require('fs');
const express = require('express');
const multer  = require('multer');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });


router.get('/test', (req, res) => {
  res.status(200).send('Successful request');
});

router.post('/audio', upload.single('audio'), (req, res) => {

  //res.status(200).json({command: "SUCCESS", success: true});
  
  // TODO - better still, don't even save the file

  // Initialize recognizer
  const recognizer = new csr.default();
  recognizer.on('final-result', command => {
    console.log("TEXT: " + command);
    // Delete the file
    fs.unlink("uploads/" + req.file.filename, err => {
      if (err) throw err;
      console.log('File deleted!'); 
    });
    res.status(200).json({command: command, success: true});
  });

  // Create and push audio
  const stream = fs.createReadStream("uploads/" + req.file.filename);

  console.log("Now recognizing from: " + "uploads/" + req.file.filename);
  recognizer.startStreaming({}, fs.createReadStream("uploads/" + req.file.filename));
});

module.exports = router;
