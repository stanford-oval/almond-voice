import record from 'node-record-lpcm16';

const ARECORD_FILE_LIMIT = 1500000000; // 1.5 GB

export default class ArecordHelper {
  byteCount: number;

  stt: any;

  constructor(stt: any) {
    this.byteCount = 0;
    this.stt = stt;
    this.track();
  }

  track(): void {
    this.stt.mic.on('data', (data: any) => {
      this.byteCount += data.length;

      // When we get to arecord wav file limit, reset
      if (this.byteCount > ARECORD_FILE_LIMIT) {
        this.restart();
      }
    });
  }

  restart(): void {
    this.stt.mic.unpipe(this.stt.detector);
    record.stop();

    // Restart the audio recording
    this.stt.mic = this.stt.createRecorder();
    this.byteCount = 0;
    this.track();
    this.stt.mic.pipe(this.stt.detector);
  }
}
