import crypto from 'crypto';
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

import debug from '../utils/debug';
import { initRecognizer } from '../lib/csr';
import textToSpeech from '../lib/tts';
import settings from '../utils/settings';

const upload = multer({ dest: 'uploads/' }); // audio kept in-memory
const router = express.Router();

router.post('/rest/stt', upload.single('audio'), (req, res) => {
  const errorSuffix = `If this error reoccurs, please file a GitHub issue at ${settings.repoUrl}.`;

  if (!req.file) {
    res.status(400).json({
      status: 'error',
      error:
        'The body of the request must contain a .wav file with the correct MIME type audio/wav in a field named audio.',
    });
  }

  const audioFn = `uploads/${req.file.filename}`;
  fs.readFile(audioFn, (err, wavData) => {
    if (err) {
      debug.recognizer(err);
      res.status(500).json({
        status: 'error',
        error: `Internal server error. ${errorSuffix}`,
      });
    }

    const rawWavFile = new WaveFile(wavData);
    rawWavFile.toSampleRate(16000);

    fs.writeFile(audioFn, rawWavFile.toBuffer(), problem => {
      if (problem) {
        debug.recognizer(problem);
        res.status(500).json({
          status: 'error',
          error: `Filesystem error. ${errorSuffix}`,
        });
      }
    });

    const sdkAudioInputStream = AudioInputStream.createPushStream();
    const recognizer = initRecognizer(sdkAudioInputStream);

    recognizer.recognized = (_, e): void => {
      // Indicates that recognizable speech was not detected, and that recognition is done.
      if (e.result.reason === ResultReason.NoMatch) {
        res.status(400).json({
          status: 'error',
          error: 'Speech unrecognizable.',
        });
      }
    };

    recognizer.recognizeOnceAsync(
      (result: SpeechRecognitionResult) => {
        debug.recognizer(`Result: ${result.text}`);
        res.status(200).json({
          status: 'ok',
          text: result.text,
        });
        recognizer.close();
      },
      () => {
        res.status(400).json({
          status: 'error',
          error: 'Speech recognition failed due to internal error.',
        });
        recognizer.close();
      },
    );

    const fileStream = fs.createReadStream(`uploads/${req.file.filename}`);
    const wavReader = new wav.Reader();
    wavReader.on('format', (format: any) => {
      debug.recognizer(format);
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
  const name = crypto.randomBytes(32).toString('hex');
  const downloadFn = path.resolve(`downloads/${name}.wav`);
  const errorSuffix = `If this error reoccurs, please file a GitHub issue at ${settings.repoUrl}.`;

  let fileStream;
  try {
    fileStream = fs.createWriteStream(downloadFn);
  } catch (e) {
    debug.tts(e);
    res.status(500).json({
      status: 'error',
      error: `File system error. ${errorSuffix}`,
    });
  }

  try {
    textToSpeech(req.body.text, fileStream);
    res.status(200).json({
      status: 'ok',
      audio: `/audio/${name}.wav`,
    });
  } catch (e) {
    debug.tts(e);
    res.status(400).json({
      status: 'error',
      error: `Bad request. ${errorSuffix}.`,
    });
  }
});

router.get('/audio/:audioFileName', (req, res) => {
  const filename = req.params.audioFileName;
  const downloadFn = path.resolve(`downloads/${filename}`);
  res.set('Content-Type', 'audio/wav');
  res.sendFile(downloadFn);
});

export default router;
