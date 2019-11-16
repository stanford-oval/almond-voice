import debug from 'debug';

const micDebug = debug('mic');
const recognizerDebug = debug('recognizer');

export default {
  mic: micDebug,
  recognizer: recognizerDebug
};
