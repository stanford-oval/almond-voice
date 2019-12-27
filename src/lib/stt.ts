/* eslint-disable @typescript-eslint/no-explicit-any */
import recorder from 'node-record-lpcm16';
import { Detector, Models } from 'snowboy';
import { EventEmitter } from 'events';
import CloudSpeechRecognizer from './csr';
import ArecordHelper from './arecordHelper';

const ERROR = {
  NOT_STARTED: 'NOT_STARTED',
  INVALID_INDEX: 'INVALID_INDEX',
};

// Replaces Sonus pseudo-class
export default class STT extends EventEmitter {
  opts: any;

  models: any;

  mic: any;

  recordProgram: string;

  device: string;

  started: boolean;

  hotwords: any;

  resource: string;

  audioGain: number;

  language: string;

  detector: any;

  csr: CloudSpeechRecognizer;

  recording: any;

  record: any;

  constructor(options: any) {
    super();
    this.opts = options;
    this.models = new Models();
    this.mic = null;
    this.csr = new CloudSpeechRecognizer();
    this.recordProgram = options.recordProgram;
    this.device = options.device;
    this.started = false;
    // If we don't have any hotwords passed in, add the default global model
    this.hotwords = options.hotwords || [1];
    this.hotwords.forEach((model: any) => {
      this.models.add({
        file: model.file || 'node_modules/snowboy/resources/snowboy.umdl',
        sensitivity: model.sensitivity || '0.5',
        hotwords: model.hotwords || 'default',
      });
    });
    this.resource =
      options.resource || 'node_modules/snowboy/resources/common.res';
    this.audioGain = options.audioGain || 2.0;
    this.language = options.language || 'en-US';
    this.record = recorder.record({
      threshold: 0,
      device: null,
      recordProgram: 'rec',
      verbose: false,
    });

    // Building options for snowboy
    this.opts.hotwords = this.hotwords;
    this.opts.models = this.models;
    this.opts.resource = this.resource;
    this.opts.audioGain = this.audioGain;
    this.opts.language = this.language;

    this.detector = new Detector(this.opts);

    this.detector.on('silence', () => this.emit('silence'));
    this.detector.on('sound', () => this.emit('sound'));

    // When a hotword is detected pipe the audio stream to speech detection
    this.detector.on('hotword', (index: any, hotword: any) => {
      this.trigger(index, hotword);
    });

    // Speech recognition callbacks
    this.csr.on('error', (error: Error) =>
      this.emit('error', { streamingError: error }),
    );
    this.csr.on('partial-result', (transcript: any) =>
      this.emit('partial-result', transcript),
    );
    this.csr.on('final-result', (transcript: any) => {
      this.emit('final-result', transcript);
    });
  }

  trigger(index: any, hotword: any): void {
    if (this.started) {
      try {
        const triggerHotword =
          index === 0 ? hotword : this.models.lookup(index);
        this.emit('hotword', index, triggerHotword);
        this.csr.startStreaming(this.opts, this.mic);
      } catch (e) {
        throw Error(`${ERROR.INVALID_INDEX}: ${e}`);
      }
    } else {
      throw ERROR.NOT_STARTED;
    }
  }

  pause(): void {
    this.record.pause();
  }

  resume(): void {
    this.record.resume();
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

  stop(): void {
    this.record.stop();
  }

  createRecorder(): any {
    return this.record.stream();
  }
}
