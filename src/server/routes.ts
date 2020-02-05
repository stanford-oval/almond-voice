import express from 'express';
import multer from 'multer';
import {
  AudioInputStream,
  ResultReason,
  SpeechRecognitionResult,
} from '@euirim/microsoft-cognitiveservices-speech-sdk';
import { initRecognizer } from '../lib/csr';
import { bufferToStream, toArrayBuffer } from '../utils/buffer';

const storage = multer.memoryStorage();
const upload = multer({ storage }); // audio kept in-memory
const router = express.Router();

router.post('/rest/stt', upload.single('audio'), (req, res, next) => {
  const sdkAudioInputStream = AudioInputStream.createPushStream();
  const recognizer = initRecognizer(sdkAudioInputStream);

  recognizer.recognized = (_, e) => {
    // Indicates that recognizable speech was not detected, and that recognition is done.
    if (e.result.reason === ResultReason.NoMatch) {
      res.status(400).json({
        success: false,
        error: 'Speech unrecognizable.',
      });
    }
  };

  recognizer.recognizeOnceAsync(
    (result: SpeechRecognitionResult) => {
      console.log(`Result: ${result.text}`);
      res.status(200).json({
        success: true,
        text: result.text,
      });
      recognizer.close();
    },
    () => {
      res.status(400).json({
        success: true,
        error: 'Speech recognition failed due to internal error.',
      });
      recognizer.close();
    },
  );

  const memoryStream = bufferToStream(req.file.buffer);
  memoryStream
    .on('data', (data: any) => {
      console.log('Received data!');
      sdkAudioInputStream.write(toArrayBuffer(data));
    })
    .on('end', () => {
      sdkAudioInputStream.close();
    });
});

export default router;
