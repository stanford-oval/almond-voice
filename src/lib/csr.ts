import { EventEmitter } from 'events';
import {
  AudioConfig,
  CancellationReason,
  NoMatchDetails,
  NoMatchReason,
  ResultReason,
  SpeechConfig,
  AudioInputStream,
  SpeechRecognizer,
  SpeechRecognitionResult,
} from '@euirim/microsoft-cognitiveservices-speech-sdk';
import debug from '../utils/debug';
import settings from '../utils/settings';

export interface Hotword {
  file: string;
  sensitivity: string;
  hotwords: string[];
}

/* Adapted from https://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer */
const toArrayBuffer = (buf: Buffer): ArrayBuffer => {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; i += 1) {
    view[i] = buf[i];
  }
  return ab;
};

export function initRecognizer(sdkInputStream: any): SpeechRecognizer {
  const audioConfig = AudioConfig.fromStreamInput(sdkInputStream);
  const speechConfig = SpeechConfig.fromSubscription(
    settings.subscriptionKey,
    settings.serviceRegion,
  );
  speechConfig.speechRecognitionLanguage = settings.language; // tslint:disable-line

  // Recognizer settings
  return new SpeechRecognizer(speechConfig, audioConfig);
}

export default class CloudSpeechRecognizer extends EventEmitter {
  listening: boolean;

  constructor() {
    super();
    this.listening = false;
  }

  startStreaming(options: any, audioStream: any): void {
    if (this.listening) {
      return;
    }

    let hasResults = false;
    this.listening = true;

    const sdkInputStream = AudioInputStream.createPushStream();
    const recognizer = initRecognizer(sdkInputStream);
    recognizer.recognizing = (_, e) => {
      const reason = `(recognizing) Reason: ${ResultReason[e.result.reason]}`;
      const text = `(recognizing) Text: ${e.result.text}`;
      debug.recognizer(reason);
      debug.recognizer(text);
    };

    // The event recognized signals that a final recognition result is received.
    // This is the final event that a phrase has been recognized.
    // For continuous recognition, you will get one recognized event for each phrase recognized.
    recognizer.recognized = (_, e) => {
      // Indicates that recognizable speech was not detected, and that recognition is done.
      if (e.result.reason === ResultReason.NoMatch) {
        const noMatchDetail = NoMatchDetails.fromResult(e.result);
        debug.recognizer(
          `(recognized) Reason: ${ResultReason[e.result.reason]}`,
        );
        debug.recognizer(
          `(recognized) NoMatchReason: ${NoMatchReason[noMatchDetail.reason]}`,
        );
      } else {
        debug.recognizer(
          `(recognized) Reason: ${ResultReason[e.result.reason]}`,
        );
        debug.recognizer(`(recognized) Text: ${e.result.text}`);
      }
    };

    // The event signals that the service has stopped processing speech.
    // https://docs.microsoft.com/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognitioncanceledeventargs?view=azure-node-latest
    // This can happen for two broad classes of reasons.
    // 1. An error is encountered.
    //    In this case the .errorDetails property will contain a textual representation of the error.
    // 2. Speech was detected to have ended.
    //    This can be caused by the end of the specified file being reached, or ~20 seconds of silence from a microphone input.
    recognizer.canceled = (_, e) => {
      const str = `(canceled) Reason: ${CancellationReason[e.reason]}`;
      debug.recognizer(
        e.reason === CancellationReason.Error
          ? `${str}: ${e.errorDetails}`
          : str,
      );
    };

    // Signals that a new session has started with the speech service
    recognizer.sessionStarted = (_, e) => {
      const str = `(sessionStarted) SessionId: ${e.sessionId}`;
      debug.recognizer(str);
    };

    // Signals the end of a session with the speech service.
    recognizer.sessionStopped = (_, e) => {
      const str = `(sessionStopped) SessionId: ${e.sessionId}`;
      debug.recognizer(str);
    };

    // Signals that the speech service has started to detect speech.
    recognizer.speechStartDetected = (_, e) => {
      const str = `(speechStartDetected) SessionId: ${e.sessionId}`;
      debug.recognizer(str);
    };

    // Signals that the speech service has detected that speech has stopped.
    recognizer.speechEndDetected = (_, e) => {
      const str = `(speechEndDetected) SessionId: ${e.sessionId}`;
      debug.recognizer(str);
      this.listening = false;
    };

    recognizer.recognizeOnceAsync(
      (result: SpeechRecognitionResult) => {
        hasResults = true;
        recognizer.close();
        debug.recognizer(result);
        this.emit('final-result', result.text);
      },
      () => {
        debug.recognizer('Recognizer failed.');
      },
    );

    audioStream.on('data', (data: any) => {
      sdkInputStream.write(toArrayBuffer(data));
    }).on('end', () => {
      sdkInputStream.close();
    });
  }
}
