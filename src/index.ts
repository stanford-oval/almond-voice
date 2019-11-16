// tslint:disable:no-expression-statement
import dotenv from 'dotenv'
// initialize dotenv
dotenv.config();

import debug from 'debug';
import { speechToText } from './lib/stt';


// init debug
debug.enable('mic recognizer');

async function main(): Promise<void> {
  // trigger stt
  speechToText();
  // query almond
  // trigger tts
  return;
};

main();