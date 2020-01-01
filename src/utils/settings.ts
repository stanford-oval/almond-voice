const settings = {
  language: process.env.SPEECH_SDK_LANGUAGE as string,
  serviceRegion: process.env.SPEECH_SDK_SERVICE_REGION as string,
  subscriptionKey: process.env.SPEECH_SDK_SUBSCRIPTION_KEY as string,
  oauth: {
    clientId: process.env.OAUTH_CLIENT_ID as string,
    clientSecret: process.env.OAUTH_CLIENT_SECRET as string,
    redirectUri: 'https://localhost:3000/callback',
    tokenHost: 'https://almond.stanford.edu',
    tokenPath: '/me/api/oauth2/token',
    authorizePath: '/me/api/oauth2/authorize',
  },
};

export default settings;
