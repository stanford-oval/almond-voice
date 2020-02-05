import OAuth, { ModuleOptions, OAuthClient } from 'simple-oauth2';
import open from 'open';
import debug from './debug';
import settings from './settings';

export default class Auth {
  credentials: ModuleOptions;

  oauth2: OAuthClient;

  constructor() {
    this.credentials = {
      client: {
        id: settings.oauth.clientId,
        secret: settings.oauth.clientSecret,
      },
      auth: {
        tokenHost: settings.oauth.tokenHost,
        tokenPath: settings.oauth.tokenPath,
        authorizePath: settings.oauth.authorizePath,
      },
    };
    this.oauth2 = OAuth.create(this.credentials);
  }

  async authorize(): Promise<void> {
    const authUri = this.oauth2.authorizationCode.authorizeURL({
      // eslint-disable-next-line @typescript-eslint/camelcase
      redirect_uri: settings.oauth.redirectUri,
      scope: 'profile user-read user-read-results user-exec-command',
    });

    debug.auth(authUri);

    await open(authUri);
  }

  async getAccessToken(authCode: string): Promise<OAuth.AccessToken> {
    const tokenConfig = {
      code: authCode,
      // eslint-disable-next-line @typescript-eslint/camelcase
      redirect_uri: settings.oauth.redirectUri,
      scope: 'profile',
    };
    const httpOptions = {};

    const result = await this.oauth2.authorizationCode.getToken(
      tokenConfig,
      httpOptions,
    );
    const accessToken = this.oauth2.accessToken.create(result);

    debug.auth(`Token: ${accessToken.token.access_token}`);

    return accessToken;
  }
}
