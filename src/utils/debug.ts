import debug from 'debug';

const micDebug = debug('mic');
const recognizerDebug = debug('recognizer');
const ttsDebug = debug('tts');

export default {
  mic: micDebug,
  recognizer: recognizerDebug,
  tts: ttsDebug,
};
