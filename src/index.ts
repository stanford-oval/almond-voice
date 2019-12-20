// tslint:disable:no-expression-statement
import dotenv from 'dotenv';
// initialize dotenv
dotenv.config();

/* eslint-disable import/first, import/named */
import debug from 'debug';
import { speechToText } from './lib/stt';
import textToSpeech from './lib/tts';
/* eslint-enable import/first, import/named */

// init debug
debug.enable('mic recognizer tts');

async function main(): Promise<void> {
  // trigger stt
  speechToText(textToSpeech);
  // query almond
  // trigger tts
}

main();
