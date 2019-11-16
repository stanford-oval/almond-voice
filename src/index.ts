// tslint:disable:no-expression-statement
import dotenv from 'dotenv'
// initialize dotenv
dotenv.config();

import debug from 'debug'; // tslint:disable-line

// Debug init
// const micDebug = debug('mic');
// const recognizerDebug = debug('recognizer');
debug.enable('mic recognizer');

const main = async () => {
  // trigger stt
  // query almond
  // trigger tts
  return;
};

main();