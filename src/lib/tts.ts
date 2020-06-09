import rp from 'request-promise';
import xmlbuilder from 'xmlbuilder';
import debug from '../utils/debug';
import settings from '../utils/settings';

function getAccessToken(subscriptionKey: string): any {
  const options = {
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
    method: 'POST',
    uri: 'https://westus2.api.cognitive.microsoft.com/sts/v1.0/issuetoken',
  };
  return rp(options);
}

export default async function textToSpeech(
  text: string,
  stream: any,
): Promise<void> {
  const accessToken: string = await getAccessToken(settings.subscriptionKey);
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
    .txt(text)
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
      request.pipe(stream);
      debug.tts('\nYour file is ready.\n');
    }
  });
}
