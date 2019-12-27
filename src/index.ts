// tslint:disable:no-expression-statement
import dotenv from 'dotenv';
// initialize dotenv
dotenv.config();

/* eslint-disable import/first, import/named */
import debug from 'debug';
import STT from './lib/stt';
import { initRecognizer, initAudioInputStream } from './lib/child';
/* eslint-enable import/first, import/named */

// init debug
debug.enable('mic recognizer tts');

async function main(): Promise<void> {
  const hotwords = [
    {
      file: './src/resources/jarvis.umdl',
      sensitivity: '0.5,0.50',
      hotwords: ['jarvis', 'jarvis2'],
    },
  ];
  const recognizer = initRecognizer(initAudioInputStream());
  const stt = new STT({ hotwords }, recognizer);

  stt.start();
}

main();
