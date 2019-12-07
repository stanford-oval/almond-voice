const express = require('express');
const router = express.Router();
const multer  = require('multer');
const fs = require('fs');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

const upload = multer({ dest: 'uploads/' });

const subscriptionKey = process.env.AZUREKEY;
const serviceRegion = process.env.AZUREREGION;

router.get('/test', (req, res) => {
  res.status(200).send('Successful request');
});

router.post('/audio', upload.single('audio'), (req, res) => {

  // res.status(200).json({command: "SUCCESS", success: true});
  
  // TODO - better still, don't even save the file

  // Create and push audio to pushstream
  const pushStream = sdk.AudioInputStream.createPushStream();
  fs.createReadStream("uploads/" + req.file.filename).on('data', arrayBuffer => {
    pushStream.write(arrayBuffer.buffer);
  }).on('end', () => {
    pushStream.close();
    // audioConfig.close();
  });

  // Initialize recognizer
  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
  speechConfig.speechRecognitionLanguage = 'en-US';
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  console.log("Now recognizing from: " + "uploads/" + req.file.filename);

  // Start STT
  let command = "";
  recognizer.recognizeOnceAsync(
    function(result) {
      console.log(result);
      console.log("TEXT: " + result.text);
      command = result.text;
      recognizer.close();
      // recognizer = null;
      // pushStream = null;
      // audioConfig = null;
      // speechConfig = null;
      // Delete the file
      fs.unlink("uploads/" + req.file.filename, err => {
        if (err) throw err;
        console.log('File deleted!'); 
      });
      res.status(200).json({command: command, success: true});
    },
    function(error) {
      console.trace("Error - " + error);
      recognizer.close();
      // recognizer = null;
      // pushStream = null;
      // audioConfig = null;
      // speechConfig = null;
      // Delete the file
      fs.unlink("uploads/" + req.file.filename, err => {
        if (err) throw err;
        console.log('File deleted!'); 
      });
      res.status(200).json({command: error, success: false});
    }
  );
});

module.exports = router;
