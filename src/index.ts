import dotenv from 'dotenv';
// initialize dotenv
dotenv.config();

/* eslint-disable import/first, import/named */
import debug from 'debug';
import fs from 'fs';
import https from 'https';
import express from 'express';
import Oracle from './lib/oracle';
import Auth from './utils/auth';

// init debug
debug.enable('auth mic recognizer tts');

async function main(): Promise<void> {
  const app = express();
  const auth = new Auth();

  // for OAuth
  app.get('/callback', async (req, _) => {
    const { code } = req.query;
    const accessToken = await auth.getAccessToken(code);
    const oracle = new Oracle(accessToken);
    oracle.start();
  });

  await auth.authorize();
  https
    .createServer(
      {
        key: fs.readFileSync('./keys/key.pem'),
        cert: fs.readFileSync('./keys/cert.pem'),
        passphrase: process.env.HTTPS_PASSPHRASE,
      },
      app,
    )
    .listen(3000);
}

main();
