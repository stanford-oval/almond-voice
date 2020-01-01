import rp from 'request-promise';
import Speaker from 'speaker';
import xmlbuilder from 'xmlbuilder';
import { AccessToken } from 'simple-oauth2';
import debug from '../utils/debug';
import settings from '../utils/settings';
import STT from './stt';
import { Hotword } from './csr';
import Almond from '../utils/almond';

const getAccessToken = (subscriptionKey: string): rp.RequestPromise => {
  const options = {
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
    method: 'POST',
    uri: 'https://westus2.api.cognitive.microsoft.com/sts/v1.0/issuetoken',
  };
  return rp(options);
};

export default class Oracle {
  isSpeaking: boolean;

  hotwords: Hotword[];

  accessToken: AccessToken;

  constructor(accessToken: AccessToken) {
    this.isSpeaking = false;
    this.hotwords = [
      {
        file: './src/resources/jarvis.umdl',
        sensitivity: '0.5,0.50',
        hotwords: ['jarvis', 'jarvis2'],
      },
    ];
    this.accessToken = accessToken;
  }

  private async think(prompt: string): Promise<string> {
    const almond = new Almond(this.accessToken);
    return almond.getReply(prompt);
  }

  speak(statement: string): void {
    this.isSpeaking = true;
    getAccessToken(settings.subscriptionKey)
      .then((accessToken: string) => {
        // Create the SSML request.
        const xmlBody = xmlbuilder
          .create('speak')
          .att('version', '1.0')
          .att('xml:lang', 'en-us')
          .ele('voice')
          .att('xml:lang', 'en-us')
          .att(
            'name',
            'Microsoft Server Speech Text to Speech Voice (en-US, GuyNeural)',
          )
          .txt(statement)
          .end();
        // Convert the XML into a string to send in the TTS request.
        const body = xmlBody.toString();

        const options = {
          baseUrl: 'https://westus2.tts.speech.microsoft.com/',
          body,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/ssml+xml',
            'User-Agent': 'YOUR_RESOURCE_NAME',
            'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
            'cache-control': 'no-cache',
          },
          method: 'POST',
          url: 'cognitiveservices/v1',
        };

        const request = rp(options).on('response', response => {
          if (response.statusCode === 200) {
            const speaker = new Speaker({
              bitDepth: 16, // 16-bit samples
              channels: 1,
              sampleRate: 24000, // 24kHz sample rate
            });
            debug.tts('\nSpeaking.\n');
            request.pipe(speaker).on('error', (e: Error) => {
              debug.tts(`Speaking failed. Reason: ${e}`);
            });
            this.isSpeaking = false;
          }
        });
        return request;
      })
      .catch((e: Error) => {
        debug.tts(e);
      });
  }

  start() {
    this.speak("Hello, I'm Genie. How can I help you?");
    const stt = new STT({ hotwords: this.hotwords });
    stt.on('hotword', () => console.log('HOTWORD!'));
    stt.on('final-result', async (transcript: any) => {
      const reply = await this.think(transcript);
      this.speak(reply);
    });
    stt.start();
  }
}
