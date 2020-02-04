import bodyParser from 'body-parser';
import express from 'express';
import expressWS from 'express-ws';
import {
  AudioInputStream,
  ResultReason,
  SpeechRecognitionResult,
} from 'microsoft-cognitiveservices-speech-sdk';
import websocketStream from 'websocket-stream/stream';
import websocket from 'ws';

import { initRecognizer } from '../lib/csr';
import { toArrayBuffer } from '../utils/buffer';
import routes from './routes';

const port = process.env.PORT || 8000;

// Extend express to accomodate websockets
const { app } = expressWS(express(), undefined, {
  wsOptions: {
    perMessageDeflate: false, // improve audio stream stability
  },
});

app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);
app.use(bodyParser.json());

// Websockets
app.ws('/stt', (ws: websocket, req: express.Request) => {
  const sdkAudioInputStream = AudioInputStream.createPushStream();
  const recognizer = initRecognizer(sdkAudioInputStream);

  // convert ws to stream
  const stream = websocketStream(ws, {
    binary: true,
  });

  recognizer.recognized = (_, e) => {
    // Indicates that recognizable speech was not detected, and that recognition is done.
    if (e.result.reason === ResultReason.NoMatch) {
      ws.send({ success: false, error: 'Speech unrecognizable.' });
    }
  };

  recognizer.recognizeOnceAsync(
    (result: SpeechRecognitionResult) => {
      recognizer.close();
      ws.send({
        success: true,
        text: result.text,
      });
    },
    () => {
      recognizer.close();
      ws.send({
        success: false,
        error: 'Speech recognition failed due to internal error.',
      });
    },
  );

  stream
    .on('data', (data: any) => {
      sdkAudioInputStream.write(toArrayBuffer(data));
    })
    .on('end', () => {
      sdkAudioInputStream.close();
    });
});

// Any other routes (for future expansion)
app.use('/', routes);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${port}`);
});
