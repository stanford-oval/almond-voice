import axios from 'axios';
import { AccessToken } from 'simple-oauth2';

export default class Almond {
  accessToken: AccessToken;

  constructor(accessToken: AccessToken) {
    this.accessToken = accessToken;
  }

  async getReply(prompt: string): Promise<string> {
    const { token } = this.accessToken;
    const command = {
      type: 'command',
      text: prompt,
    };
    const headers = {
      Authorization: `Bearer ${token.access_token}`,
    };

    const response = await axios.post(
      'https://almond.stanford.edu/me/api/converse',
      { command },
      { headers },
    );
    return response.data.messages[0].text;
  }
}
