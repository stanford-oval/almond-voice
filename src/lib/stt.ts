import record from 'node-record-lpcm16';
import stream from 'stream';
import { Detector, Models } from 'snowboy';
import { EventEmitter } from 'events';
import Annyang from './annyang-core';
import CloudSpeechRecognizer from './csr';
import ArecordHelper from './arecordHelper';

const ERROR = {
  NOT_STARTED: 'NOT_STARTED',
  INVALID_INDEX: 'INVALID_INDEX',
};

// Replaces Sonus pseudo-class
export default class STT extends EventEmitter {
  annyang: any;

  opts: any;

  models: any;

  sonus: stream.Writable;

  mic: any;

  recordProgram: string;

  device: any;

  started: boolean;

  hotwords: any;

  resource: string;

  audioGain: number;

  language: string;

  detector: any;

  csr: any;

  constructor(options: any, recognizer: any) {
    super();
    this.opts = options;
    this.annyang = Annyang;
    this.models = new Models();
    this.sonus = new stream.Writable();
    this.mic = null;
    this.csr = new CloudSpeechRecognizer(recognizer);
    this.recordProgram = options.recordProgram;
    this.device = options.device;
    this.started = false;
    // If we don't have any hotwords passed in, add the default global model
    this.hotwords = options.hotwords || [1];
    this.hotwords.forEach((model: any) => {
      this.models.add({
        file: model.file || 'node_modules/snowboy/resources/snowboy.umdl',
        sensitivity: model.sensitivity || '0.5',
        hotwords: model.hotword || 'default',
      });
    });
    this.resource =
      options.resource || 'node_modules/snowboy/resources/common.res';
    this.audioGain = options.audioGain || 2.0;
    this.language = options.language || 'en-US';

    this.detector = new Detector(options);

    this.detector.on('silence', () => this.emit('silence'));
    this.detector.on('sound', () => this.emit('sound'));

    // When a hotword is detected pipe the audio stream to speech detection
    this.detector.on('hotword', (index: any, hotword: any) => {
      this.trigger(index, hotword);
    });

    // Handel speech recognition requests
    this.csr.on('error', (error: Error) =>
      this.emit('error', { streamingError: error }),
    );
    this.csr.on('partial-result', (transcript: any) =>
      this.emit('partial-result', transcript),
    );
    this.csr.on('final-result', (transcript: any) => {
      this.emit('final-result', transcript);
      this.annyang.trigger(transcript);
    });
  }

  trigger(index: any, hotword: any): void {
    if (this.started) {
      try {
        const triggerHotword =
          index === 0 ? hotword : this.models.lookup(index);
        this.emit('hotword', index, triggerHotword);
        this.csr.startStreaming(this.opts, this.mic, this.csr);
      } catch (e) {
        throw ERROR.INVALID_INDEX;
      }
    } else {
      throw ERROR.NOT_STARTED;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  pause(): void {
    record.pause();
  }

  // eslint-disable-next-line class-methods-use-this
  resume(): void {
    record.resume();
  }

  start(): void {
    this.mic = this.createRecorder();

    if (this.recordProgram === 'arecord') {
      // eslint-disable-next-line no-new
      new ArecordHelper(this);
    }

    this.mic.pipe(this.detector);
    this.started = true;
  }

  // eslint-disable-next-line class-methods-use-this
  stop(): void {
    record.stop();
  }

  createRecorder(): any {
    return record.start({
      threshold: 0,
      device: this.device || null,
      recordProgram: this.recordProgram || 'rec',
      verbose: false,
    });
  }
}
