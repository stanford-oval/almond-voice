import fs from 'fs';
import express from 'express';
import multer from 'multer';
import {
  AudioInputStream,
  ResultReason,
  SpeechRecognitionResult,
} from '@euirim/microsoft-cognitiveservices-speech-sdk';
import wav from 'wav';
import { WaveFile } from 'wavefile';
import path from 'path';

import { initRecognizer } from '../lib/csr';
import textToSpeech from '../lib/tts';

const upload = multer({ dest: 'uploads/' }); // audio kept in-memory
const router = express.Router();

router.post('/rest/stt', upload.single('audio'), (req, res, next) => {
  const audioFn = `uploads/${req.file.filename}`;
  fs.readFile(audioFn, (err, wavData) => {
    if (err) throw err;

    const rawWavFile = new WaveFile(wavData);
    rawWavFile.toSampleRate(16000);

    fs.writeFile(audioFn, rawWavFile.toBuffer(), problem => {
      if (problem) throw err;
    });

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

    const fileStream = fs.createReadStream(`uploads/${req.file.filename}`);
    const wavReader = new wav.Reader();
    wavReader.on('format', (format: any) => {
      console.log(format);
      wavReader
        .on('data', (data: any) => {
          sdkAudioInputStream.write(data);
        })
        .on('end', () => {
          sdkAudioInputStream.close();
        });
    });

    fileStream.pipe(wavReader);
  });
});

router.post('/rest/tts', (req, res) => {
  const name = Math.random().toString(36);
  const downloadFn = path.resolve(`downloads/${name}.wav`);
  const fileStream = fs.createWriteStream(downloadFn);
  textToSpeech(req.body.text, fileStream);
  res.status(200).json({
    success: true,
    audio: `/audio/${name}.wav`,
  });
});

router.get('/audio/:audioFileName', (req, res) => {
  const filename = req.params.audioFileName;
  const downloadFn = path.resolve(`downloads/${filename}`);
  res.set('Content-Type', 'audio/wav');
  res.sendFile(downloadFn);
});

export default router;
