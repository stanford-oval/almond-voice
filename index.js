// Load environment variables from .env
require('dotenv').config();

const debug = require('debug');
const fs = require('fs');
const mic = require('mic');
const rp = require('request-promise');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const settings = require('./settings');
const xmlbuilder = require('xmlbuilder');

// Debug init
const micDebug = debug('mic');
const recognizerDebug = debug('recognizer');
debug.enable('mic recognizer');

/**
 * Create a push stream used to convey data to speech sdk.
 */
const openPushStream = () => {
  const pushStream = sdk.AudioInputStream.createPushStream();
  return pushStream;
};

const sdkInputStream = openPushStream();

const micInstance = mic({
  rate: '16000',
  channels: '1',
  debug: false,
  exitOnSilence: 6,
  device: 'pulse'
});

const micInputStream = micInstance.getAudioStream();

// Mic event handling
micInputStream.on('startComplete', () => {
  micDebug('Mic START successful.');
});

micInputStream.on('stopComplete', () => {
  micDebug('Mic STOP successful.');
});

micInputStream.on('silence', () => {
  micDebug('Got signal SILENCE.');
});

micInputStream.on('processExitComplete', () => {
  micDebug('Mic process exited.');
  sdkInputStream.close();
});

micInputStream.on('data', data => {
  // micDebug(`Received input stream: ${data.length}`);
  sdkInputStream.write(data.slice()); // slice without args copies array
});

const audioConfig = sdk.AudioConfig.fromStreamInput(sdkInputStream);
const speechConfig = sdk.SpeechConfig.fromSubscription(
  settings.subscriptionKey,
  settings.serviceRegion
);
speechConfig.speechRecognitionLanguage = settings.language;

// Recognizer settings
let recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
recognizer.recognizing = (_, e) => {
  const reason = `(recognizing) Reason: ${sdk.ResultReason[e.result.reason]}`;
  const text = `(recognizing) Text: ${e.result.text}`;
  recognizerDebug(reason);
  recognizerDebug(text);
};

// The event recognized signals that a final recognition result is received.
// This is the final event that a phrase has been recognized.
// For continuous recognition, you will get one recognized event for each phrase recognized.
recognizer.recognized = (_, e) => {
  // Indicates that recognizable speech was not detected, and that recognition is done.
  if (e.result.reason === sdk.ResultReason.NoMatch) {
    const noMatchDetail = sdk.NoMatchDetails.fromResult(e.result);
    recognizerDebug(
      `(recognized) Reason: ${sdk.ResultReason[e.result.reason]}`
    );
    recognizerDebug(
      `(recognized) NoMatchReason: ${sdk.NoMatchReason[noMatchDetail.reason]}`
    );
  } else {
    recognizerDebug(
      `(recognized) Reason: ${sdk.ResultReason[e.result.reason]}`
    );
    recognizerDebug(`(recognized) Text: ${e.result.text}`);
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
  const str = `(canceled) Reason: ${sdk.CancellationReason[e.reason]}`;
  if (e.reason === sdk.CancellationReason.Error) {
    str += ': ' + e.errorDetails;
  }
  recognizerDebug(str);
};

// Signals that a new session has started with the speech service
recognizer.sessionStarted = (_, e) => {
  const str = `(sessionStarted) SessionId: ${e.sessionId}`;
  recognizerDebug(str);
};

// Signals the end of a session with the speech service.
recognizer.sessionStopped = (_, e) => {
  const str = `(sessionStopped) SessionId: ${e.sessionId}`;
  recognizerDebug(str);
};

// Signals that the speech service has started to detect speech.
recognizer.speechStartDetected = (_, e) => {
  const str = `(speechStartDetected) SessionId: ${e.sessionId}`;
  recognizerDebug(str);
};

// Signals that the speech service has detected that speech has stopped.
recognizer.speechEndDetected = (_, e) => {
  const str = `(speechEndDetected) SessionId: ${e.sessionId}`;
  recognizerDebug(str);
};

// Start the recognizer
recognizer.recognizeOnceAsync(
  async result => {
    recognizer.close();
    recognizer = undefined;
    console.log(result);
    let accessToken;
    try {
      accessToken = await getAccessToken(settings.subscriptionKey);
    } catch (error) {
      console.log(`FAILURE to get access token: ${error}`);
    }
    try {
      const ttsResult = await textToSpeech(accessToken, result.privText);
    } catch (error) {
      console.log(`FAILURE TTS: ${error}`);
    }
  },
  err => {
    recognizer.close();
    recognizer = undefined;
  }
);

// Start mic
micInstance.start();

const getAccessToken = subscriptionKey => {
  let options = {
    method: 'POST',
    uri: 'https://westus2.api.cognitive.microsoft.com/sts/v1.0/issuetoken',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  };
  return rp(options);
};

const textToSpeech = (accessToken, text) => {
  // Create the SSML request.
  const xml_body = xmlbuilder
    .create('speak')
    .att('version', '1.0')
    .att('xml:lang', 'en-us')
    .ele('voice')
    .att('xml:lang', 'en-us')
    .att(
      'name',
      'Microsoft Server Speech Text to Speech Voice (en-US, Guy24KRUS)'
    )
    .txt(text)
    .end();
  // Convert the XML into a string to send in the TTS request.
  const body = xml_body.toString();

  const options = {
    method: 'POST',
    baseUrl: 'https://westus2.tts.speech.microsoft.com/',
    url: 'cognitiveservices/v1',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'cache-control': 'no-cache',
      'User-Agent': 'YOUR_RESOURCE_NAME',
      'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
      'Content-Type': 'application/ssml+xml'
    },
    body: body
  };

  const request = rp(options).on('response', response => {
    if (response.statusCode === 200) {
      request.pipe(fs.createWriteStream('TTSOutput.wav'));
      console.log('\nYour file is ready.\n');
    }
  });
  return request;
};
