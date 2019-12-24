import stream from 'stream';
import { EventEmitter } from 'events';

export default class CloudSpeechRecognizer extends EventEmitter {
  listening: boolean;

  recognizer: any;

  csr: stream.Writable;

  constructor(recognizer: any) {
    super();
    this.listening = false;
    this.recognizer = recognizer;
    this.csr = new stream.Writable();
  }

  startStreaming(options: any, audioStream: any): void {
    if (this.listening) {
      return;
    }

    let hasResults = false;
    this.listening = true;

    const request = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: options.language,
        speechContexts: options.speechContexts || null,
      },
      singleUtterance: true,
      interimResults: true,
    };

    const stopStream = (recognitionStream: any): void => {
      this.listening = false;
      audioStream.unpipe(recognitionStream);
      recognitionStream.end();
    };

    const recognitionStream = this.recognizer
      .streamingRecognize(request)
      .on('error', (err: Error) => {
        this.emit('error', err);
        stopStream(recognitionStream);
      })
      .on('data', (data: any) => {
        if (data.results[0] && data.results[0].alternatives[0]) {
          hasResults = true;
          // Emit partial or final results and end the stream
          if (data.error) {
            this.emit('error', data.error);
            stopStream(recognitionStream);
          } else if (data.results[0].isFinal) {
            this.emit(
              'final-result',
              data.results[0].alternatives[0].transcript,
            );
            stopStream(recognitionStream);
          } else {
            this.emit(
              'partial-result',
              data.results[0].alternatives[0].transcript,
            );
          }
        } else {
          // Reached transcription time limit
          if (!hasResults) {
            this.emit('final-result', '');
          }
          stopStream(recognitionStream);
        }
      });

    audioStream.pipe(recognitionStream);
  }
}
