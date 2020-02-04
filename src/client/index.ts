import mic from 'mic';
// import recorder from 'node-record-lpcm16';
import websocket from 'websocket-stream';

const main = () => {
  const micInstance = mic({
    rate: '16000',
    channels: '1',
    exitOnSilence: 6,
    debug: true,
    device: 'pulse',
  });
  const micInputStream = micInstance.getAudioStream();

  /*
  const recording = recorder.record({
    threshold: 0,
    device: null,
    recordProgram: 'rec',
    verbose: false,
  });
  */

  const ws = websocket('ws://localhost:8000/stt');

  /*
  console.log('Starting recording.');
  setTimeout(() => {
    recording.stop();
    console.log('Stopped recording.');
  }, 3000);

  setTimeout(() => null, 5000);
  */

  ws.on('error', (e: any) => {
    console.log('ERROR!');
  });
  ws.on('data', (data: any) => {
    // Convert buffer to string
    console.log(data.toString('utf8'));
  });

  micInputStream.pipe(ws);
  micInstance.start();
};

main();
