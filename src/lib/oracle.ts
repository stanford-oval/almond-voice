import mic, { Mic } from 'mic';
import {
  AudioConfig,
  AudioInputStream,
  CancellationReason,
  NoMatchDetails,
  NoMatchReason,
  ResultReason,
  SpeechConfig,
  SpeechRecognitionResult,
  SpeechRecognizer,
  PushAudioInputStream,
} from '@euirim/microsoft-cognitiveservices-speech-sdk';
import rp from 'request-promise';
import Speaker from 'speaker';
import xmlbuilder from 'xmlbuilder';
import debug from '../utils/debug';
import settings from '../utils/settings';

const getAccessToken = (subscriptionKey: string): rp.RequestPromise => {
  const options = {
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
    method: 'POST',
    uri: 'https://westus2.api.cognitive.microsoft.com/sts/v1.0/issuetoken',
  };
  return rp(options);
};

export default class Oracle {
  isListening: boolean;

  isRecognizing: boolean;

  isSpeaking: boolean;

  isThinking: boolean;

  recorder: Mic;

  recognizer: SpeechRecognizer;

  recognizerInputStream: PushAudioInputStream;

  constructor() {
    this.isListening = false;
    this.isRecognizing = false;
    this.isSpeaking = false;
    this.isThinking = false;

    this.recorder = mic({
      channels: '1',
      debug: false,
      device: 'pulse',
      exitOnSilence: 6,
      rate: '16000',
    });

    this.recognizerInputStream = AudioInputStream.createPushStream();
    const audioConfig = AudioConfig.fromStreamInput(this.recognizerInputStream);
    const speechConfig = SpeechConfig.fromSubscription(
      settings.subscriptionKey,
      settings.serviceRegion,
    );
    speechConfig.speechRecognitionLanguage = settings.language; // tslint:disable-line
    this.recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    this.setup();
  }

  private setupRecorder(): void {
    const recorderStream = this.recorder.getAudioStream();

    // Mic event handling
    recorderStream.on('startComplete', () => {
      this.isListening = true;

      debug.mic('Mic started.');
    });

    recorderStream.on('stopComplete', () => {
      this.isListening = false;

      debug.mic('Mic stopped.');
    });

    recorderStream.on('silence', () => {
      debug.mic('Got silence.');
    });

    recorderStream.on('processExitComplete', () => {
      debug.mic('Mic process exited.');
      // sdkInputStream.close();
    });

    recorderStream.on('data', data => {
      // micDebug(`Received input stream: ${data.length}`);
      this.recognizerInputStream.write(data.slice()); // slice without args copies array
    });
  }

  private setupRecognizer(): void {
    this.recognizer.recognizing = (_, e): void => {
      this.isRecognizing = true;

      const reason = `(recognizing) Reason: ${ResultReason[e.result.reason]}`;
      const text = `(recognizing) Text: ${e.result.text}`;
      debug.recognizer(reason);
      debug.recognizer(text);
    };

    // The event recognized signals that a final recognition result is received.
    // This is the final event that a phrase has been recognized.
    // For continuous recognition, you will get one recognized event for each phrase recognized.
    this.recognizer.recognized = (_, e) => {
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

      this.isRecognizing = false;
    };

    // The event signals that the service has stopped processing speech.
    // https://docs.microsoft.com/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognitioncanceledeventargs?view=azure-node-latest
    // This can happen for two broad classes of reasons.
    // 1. An error is encountered.
    //    In this case the .errorDetails property will contain a textual representation of the error.
    // 2. Speech was detected to have ended.
    //    This can be caused by the end of the specified file being reached, or ~20 seconds of silence from a microphone input.
    this.recognizer.canceled = (_, e) => {
      const str = `(canceled) Reason: ${CancellationReason[e.reason]}`;
      debug.recognizer(
        e.reason === CancellationReason.Error
          ? `${str}: ${e.errorDetails}`
          : str,
      );
    };

    // Signals that a new session has started with the speech service
    this.recognizer.sessionStarted = (_, e) => {
      const str = `(sessionStarted) SessionId: ${e.sessionId}`;
      debug.recognizer(str);
    };

    // Signals the end of a session with the speech service.
    this.recognizer.sessionStopped = (_, e) => {
      const str = `(sessionStopped) SessionId: ${e.sessionId}`;
      debug.recognizer(str);
    };

    // Signals that the speech service has started to detect speech.
    this.recognizer.speechStartDetected = (_, e) => {
      const str = `(speechStartDetected) SessionId: ${e.sessionId}`;
      debug.recognizer(str);
    };

    // Signals that the speech service has detected that speech has stopped.
    this.recognizer.speechEndDetected = (_, e) => {
      const str = `(speechEndDetected) SessionId: ${e.sessionId}`;
      debug.recognizer(str);
    };
  }

  /* Initialize event handlers. */
  private setup(): void {
    this.setupRecorder();
    this.setupRecognizer();
  }

  listen(): void {
    this.recognizer.recognizeOnceAsync(
      (result: SpeechRecognitionResult) => {
        this.recognizer.close();
        debug.recognizer(result);
        this.speak(this.think(result.text));
      },
      () => {
        this.recognizer.close();
      },
    );

    this.recorder.start();
  }

  /* Think of what to say based on what is said. */
  think(prompt: string): string {
    this.isThinking = true;
    const response = `You said "${prompt}".`;
    this.isThinking = false;
    return response;
  }

  speak(statement: string): void {
    this.isSpeaking = true;
    getAccessToken(settings.subscriptionKey)
      .then((accessToken: string) => {
        // Create the SSML request.
        const xmlBody = xmlbuilder
          .create('speak')
          .att('version', '1.0')
          .att('xml:lang', 'en-us')
          .ele('voice')
          .att('xml:lang', 'en-us')
          .att(
            'name',
            'Microsoft Server Speech Text to Speech Voice (en-US, GuyNeural)',
          )
          .txt(statement)
          .end();
        // Convert the XML into a string to send in the TTS request.
        const body = xmlBody.toString();

        const options = {
          baseUrl: 'https://westus2.tts.speech.microsoft.com/',
          body,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/ssml+xml',
            'User-Agent': 'YOUR_RESOURCE_NAME',
            'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
            'cache-control': 'no-cache',
          },
          method: 'POST',
          url: 'cognitiveservices/v1',
        };

        const request = rp(options).on('response', response => {
          if (response.statusCode === 200) {
            const speaker = new Speaker({
              bitDepth: 16, // 16-bit samples
              channels: 1, // 2 channels
              sampleRate: 24000, // 24kHz sample rate
            });
            request.pipe(speaker);
            debug.tts('\nSpeaking.\n');
            this.isSpeaking = false;
          }
        });
        return request;
      })
      .catch((e: Error) => {
        debug.tts(e);
      });
  }
}
