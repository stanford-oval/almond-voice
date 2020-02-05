import stream from 'stream';

const { Duplex } = stream;

/* Adapted from https://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer */
const toArrayBuffer = (buf: Buffer): ArrayBuffer => {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; i += 1) {
    view[i] = buf[i];
  }
  return ab;
};

// Adapted from https://stackoverflow.com/questions/46975590/how-to-upload-file-saved-in-memory-by-multer-to-another-api
const bufferToStream = (buffer: Buffer): stream.Duplex => {
  const duplexStream = new Duplex();
  duplexStream.push(buffer);
  duplexStream.push(null);
  return duplexStream;
};

export { toArrayBuffer, bufferToStream };
