import debug from 'debug';

const authDebug = debug('auth');
const micDebug = debug('mic');
const recognizerDebug = debug('recognizer');
const ttsDebug = debug('tts');

export default {
  auth: authDebug,
  mic: micDebug,
  recognizer: recognizerDebug,
  tts: ttsDebug,
};
