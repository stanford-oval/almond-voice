// tslint:disable:no-expression-statement
import dotenv from 'dotenv';
// initialize dotenv
dotenv.config();

/* eslint-disable import/first, import/named */
import debug from 'debug';
import Oracle from './lib/oracle';
/* eslint-enable import/first, import/named */

// init debug
debug.enable('mic recognizer tts');

async function main(): Promise<void> {
  const oracle = new Oracle();
  oracle.listen();
}

main();
